import numpy as np
import pandas as pd
import time
import re
import os
import sys
import argparse
import matplotlib.pyplot as plt
from sklearn.mixture import GaussianMixture
from sklearn.preprocessing import StandardScaler
from multiprocessing import Pool, cpu_count
from functools import partial


def save_phases_to_output_format(phases, df, task, output_dir):
    root_out_dir = os.path.join(output_dir, "output-phases")
    """
    Save phases according to the required output format
    
    Parameters:
        phases (dict): Dictionary of phases for each configuration
        df (DataFrame): Original DataFrame with all data
        task (str): Task name
        output_dir (str): Directory to save the output files
    """
    
    # Create a DataFrame with all phase data
    for config_key, config_phases in phases.items():
        cache = int(config_key.split('_')[1])
        print("cache: ",cache)
        mem = int(config_key.split('_')[3])
        print("mem: ",mem)

        dir = f"{output_dir}/{task}/{2 ** cache - 1}_{mem}"

        # Make the directory if it doesn't exist
        os.makedirs(dir, exist_ok=True)

        output_path = os.path.join(dir, 'phases.txt')
            
        # Get true WCET from original data
        wcet = df.loc[(df['cache'] == cache) & (df['mem'] == mem)]['time'].astype(float).max()

        max_insn = df.loc[(df['cache'] == cache) & (df['mem'] == mem)]['insn_sum'].max()
        
        output_path_wcet = os.path.join(dir, 'wcet.txt')

        with open(output_path_wcet, 'w') as file:
            file.write(f"{wcet}\n")
            file.write(f"{max_insn}\n")

        # Create a DataFrame for this phase and save to CSV
        phase_df = pd.DataFrame([{
            'phase': i+1,
            'insn_start': phase['start_insn'],
            'insn_end': phase['end_insn'],
            'insn_rate': phase['worst_case_rate']
        } for i, phase in enumerate(config_phases)])
        
        phase_df.to_csv(output_path, index=False, header=False, sep=',')
    
    return

# Load data
def read_df(cache_sizes, mem_bws, task, input_dir, num_per_config):
    
    df_list = [] #removed if add_data.csv statement
    for cache_name in cache_sizes:
        for mem_name in mem_bws:
            cache = int(np.log2(int(cache_name) + 1))
            mem = int(mem_name)

            #change your selected amount of profiles by changing num_per_config 
            for index in range(1, num_per_config + 1):

                filename = f"{input_dir}/{task}_{cache_name}_{mem_name}_perf_{index}.txt"
                
                print(f"Loading file: {filename}")

                with open(filename, 'r') as f:
                    lines = f.readlines()

                    data_rows = []

                    for line in lines:
                        if line.startswith("#") or not line.strip():
                            continue

                        parts = line.strip().split()  # Simpler split
                        if len(parts) < 3:
                            continue

                        time = float(parts[0])

                        count = int(parts[1].replace(",", "")) if '<not' not in parts[1] else 0
                        event_type = parts[2]

                        if "instructions" in event_type:
                            cur_insn = count
                            row = {'time': time, 'insn': cur_insn, 
                                'L3_req': 0, 'L3_miss': 0, 'cache': cache, 'mem': mem,
                            }
                            data_rows.append(row)

                        elif "LLC-loads" in event_type and "misses" not in event_type:
                            data_rows[-1]['L3_req'] = count

                        elif "LLC-stores" in event_type:
                            data_rows[-1]['L3_req'] += count

                        elif "LLC-loads-misses" in event_type:
                            data_rows[-1]['L3_miss'] = count

                    tmp_df = pd.DataFrame(data_rows)

                    # Calculate instruction rate
                    prev_time = 0.0  # Use 0 for the first row as specified
                    insn_rates = []
                    
                    for i, row in tmp_df.iterrows():
                        current_time = row['time']
                        time_diff = current_time - prev_time
                        
                        # Handle the case where time difference is 0 to avoid division by zero
                        if time_diff == 0:
                            rate = 0
                        else:
                            rate = row['insn'] / time_diff
                            
                        insn_rates.append(rate)
                        prev_time = current_time
                        
                    tmp_df['insn_rate'] = insn_rates

                    tmp_df["insn_sum"] = tmp_df["insn"].cumsum()

                    tmp_df = tmp_df.loc[tmp_df["insn"] != 0]

                    df_list.append(tmp_df)
                                        
                
    df = pd.concat(df_list, ignore_index=True)
    df.to_csv('all_data.csv')
    
    return df

def cluster_all_data_together(df, num_clusters=15):
    """
    Cluster the entire dataset together, then separate by configuration.
    
    Parameters:
        df (DataFrame): DataFrame containing all performance profile data
        num_clusters (int): Number of clusters for GMM
    
    Returns:
        dict: Dictionary of phases for each configuration
    """
    print("Starting GMM clustering on entire dataset")
    
    
    # Select features for clustering
    features = ['L3_req', 'L3_miss', 'insn_rate']
    X = df[features].values

    # Standardize the features to have zero mean and unit variance
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Fit GMM on all data
    start_time = time.time()  # Start timer
    gmm = GaussianMixture(n_components=num_clusters, random_state=42)
    
    try:
        gmm.fit(X_scaled)
        # Predict cluster labels for all data
        df['cluster'] = gmm.predict(X_scaled)
    except Exception as e:
        print(f"Error fitting GMM: {e}")
    
    end_time = time.time()  # Stop timer
    print(f"GMM clustering elapsed time: {end_time - start_time:.4f} seconds")

    # Plot all of the data in 3d with unique cluster colors
    fig = plt.figure(figsize=(14, 8))
    ax = fig.add_subplot(111, projection='3d')
    ax.scatter(df['L3_req'], df['L3_miss'], df['insn_rate'], c=df['cluster'], cmap='plasma', alpha=0.7, s=30)
    ax.set_xlabel('L3 Requests')
    ax.set_ylabel('L3 Misses')
    ax.set_zlabel('Instruction Rate')
    ax.set_title('GMM Clustering of All Data')
    # Save the plot
    plt.tight_layout()
    output_file = 'all_data_gmm_cluster.png'
    plt.savefig(output_file, dpi=300)
    plt.close()
    
    # Create bucket labels based on insn_sum (every 10 million instructions)
    bucket_size = 10000000
    df['bucket'] = (df['insn_sum'] // bucket_size) * bucket_size
    
    # Now process each configuration separately using the already-assigned clusters
    all_phases = {}
    
    for (cache, mem), group_df in df.groupby(['cache', 'mem']):
        print(f"Processing configuration: cache={cache}, mem={mem}")
        
        # Sort by insn_sum to ensure temporal ordering
        group_df = group_df.sort_values(by='insn_sum')
        
        # Find the most common cluster in each bucket for this configuration
        bucket_clusters = {}
        for bucket, bucket_group in group_df.groupby('bucket'):
            # Get the most common cluster in this bucket
            cluster_counts = bucket_group['cluster'].value_counts()
            most_common_cluster = cluster_counts.idxmax()
            bucket_clusters[bucket] = most_common_cluster
        
        # Assign the most common cluster of each bucket to all points in that bucket
        group_df['smoothed_cluster'] = group_df['bucket'].map(bucket_clusters)
        
        # Find change points where the smoothed cluster changes
        change_points = [0]  # Start with the first point
        smoothed_sequence = group_df['smoothed_cluster'].values
        for i in range(1, len(smoothed_sequence)):
            if smoothed_sequence[i] != smoothed_sequence[i-1]:
                change_points.append(i)
        change_points.append(len(smoothed_sequence))  # Add the last point
        
        # Create phases based on change points
        phases = []
        start_insn = 1
        
        for i in range(len(change_points) - 1):
            start_idx = change_points[i]
            end_idx = change_points[i+1]
            
            # Get the phase data
            phase_df = group_df.iloc[start_idx:end_idx].copy()  # Make a copy to avoid SettingWithCopyWarning
            
            # Skip empty phases
            if len(phase_df) <= 1:
                continue
            
            # Get start and end instruction counts
            end_insn = int(phase_df['insn_sum'].iloc[-1])
            
            # Calculate worst-case or mean instruction rate
            rate = phase_df['insn_rate'].mean()
            
            # Create phase information
            phase = {
                'start_insn': start_insn,
                'end_insn': end_insn,
                'worst_case_rate': rate,
                'mean_rate': phase_df['insn_rate'].mean(),
                'std_rate': phase_df['insn_rate'].std(),
                'cv': phase_df['insn_rate'].std() / phase_df['insn_rate'].mean() if phase_df['insn_rate'].mean() > 0 else 0,
                'mean_L3_req': phase_df['L3_req'].mean(),
                'mean_L3_miss': phase_df['L3_miss'].mean(),
                'cluster_id': int(phase_df['cluster'].iloc[0])  # Get the original GMM cluster ID 
            }
            
            start_insn = end_insn + 1
            phases.append(phase)
        
        # Store phases for this configuration
        config_key = f"cache_{cache}_mem_{mem}"
        all_phases[config_key] = phases
    
    return all_phases



# Main function to run the analysis
def main(task, input_dir, output_dir, num_clusters, num_per_config, scan_input=False):
    start_time_total = time .time()  # Start timer for total execution
    
    # Input params
    cache_sizes = [2 ** i - 1 for i in range(1, 21)]
    mem_bws = [72 * i for i in range(1, 21)]
    
    # Read in df
    df = read_df(cache_sizes, mem_bws, task, input_dir, num_per_config)


    # Cluster entire dataset at once, then separate by configuration
    phases = cluster_all_data_together(df, num_clusters)

    # Save results in your required format
    save_phases_to_output_format(phases, df, task, output_dir)
    
    # Plot the phase results for (5, 5)
 
    # Print total execution time
    end_time_total = time.time()
    print(f"Total execution time: {end_time_total - start_time_total:.2f} seconds")


def parse_arguments():
    """
    Parse command line arguments for DNA phase clustering.
    """
    parser = argparse.ArgumentParser(
        description="DNA Phase Clustering - Identify execution phases in program behavior."
    )
    
    parser.add_argument(
        "--task",
        type=str,
        required=True,
        help="Task name or identifier (e.g., 'canneal', 'dedup', 'fft')"
    )
    
    parser.add_argument(
        "--input-dir",
        type=str,
        required=True,
        help="Directory containing the input data files"
    )
    
    parser.add_argument(
        "--output-dir",
        type=str,
        required=True,
        help="Directory where output files will be saved"
    )
    
    parser.add_argument(
        "--num-clusters",
        type=int,
        default=5,
        help="Number of clusters for phase analysis (default: 5)"
    )
    
    parser.add_argument(
        "--num-per-config",
        type=int,
        default=100,
        help="Number of data points per configuration (default: 100)"
    )
    
    return parser.parse_args()

def run_dna_analysis(task, input_dir, output_dir, num_clusters, num_per_config=5, scan_input=False):
    main(task, input_dir, output_dir, num_clusters, num_per_config, scan_input)
    print(num_clusters,num_per_config)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--task", required=True)
    parser.add_argument("--input-dir", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--num-clusters", type=int, default=5)
    parser.add_argument("--num-per-config", type=int, default=5)

    # ✅ Add this line to accept --scan-input as a flag
    parser.add_argument("--scan-input", action="store_true")

    args = parser.parse_args()

    # ✅ Pass scan_input to your run_dna_analysis or main function
    run_dna_analysis(
        task=args.task,
        input_dir=args.input_dir,
        output_dir=args.output_dir,
        num_clusters=args.num_clusters,
        num_per_config=args.num_per_config,
        scan_input=args.scan_input
    )


