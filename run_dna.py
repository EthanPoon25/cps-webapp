# run_dna.py
import sys
from dna_phase_clustering import main  # Adjust based on filename

print("Python script started")

if __name__ == "__main__":
    if len(sys.argv) < 6:
        print("Not enough arguments. Expected: task input_dir output_dir num_clusters num_per_config")
        sys.exit(1)

    task = sys.argv[1]
    input_dir = sys.argv[2]
    output_dir = sys.argv[3]
    num_clusters = int(sys.argv[4])
    num_per_config = int(sys.argv[5])

    print("Arguments received:")
    print(f"  Task: {task}")
    print(f"  Input dir: {input_dir}")
    print(f"  Output dir: {output_dir}")
    print(f"  Clusters: {num_clusters}")
    print(f"  Per config: {num_per_config}")

    try:
        main(task, input_dir, output_dir, num_clusters, num_per_config)
        print("Main function executed successfully")
    except Exception as e:
        print(f"Exception occurred during execution: {e}")
        sys.exit(1)
