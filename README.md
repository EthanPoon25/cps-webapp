# CPS Web App

This Web App is a **React-based web application** designed to automate the preprocessing and taskset generation workflow for benchmark profile data. It integrates advanced algorithms such as **RASCO** and **DNA**, both of which are algoruthms developed and researched at the **University of Pennsylvania's Distributed Systems Lab** to process execution profiles, generate phases, compute WCET and theta values, and automatically construct tasksets according to user-specified utilization and resource constraints.  

This application removes the need for manually running multiple Python and C scripts, simplifying the process for researchers and developers in real-time systems.

---

## Features

### 1. Algorithm Selection
The app allows the user to select the algorithm that drives the preprocessing step:

- **RASCO** – Resource-Aware Scheduling & Clustering Optimization  (in progress)
- **DNA** – Dynamic Nonlinear Approximation ([read the paper](https://www.cis.upenn.edu/~linhphan/papers/rtas21-dna.pdf))  

**How it works:**  
The chosen algorithm affects how benchmark profile data is clustered into phases. These phases summarize the typical execution patterns of a benchmark under varying cache and memory bandwidth configurations. Choosing between RASCO and DNA allows users to tailor the analysis to their research needs, as each algorithm emphasizes different aspects of task execution variability and resource usage.

---

### 2. File Upload & Automated Preprocessing

Users can upload **ZIP files** containing benchmark profile data. The backend performs the entire preprocessing pipeline automatically, eliminating the need for manual script execution.  

**Pipeline Steps:**

1. **Unzip Input Files**  
   Extracts all benchmark profile folders and individual execution profiles for processing.

2. **Clustering**  
   Groups similar execution profiles into phases based on the selected algorithm. Clustering identifies representative execution patterns to reduce redundancy.

3. **Phase Generation**  
   Generates `phases.txt` for each benchmark/configuration, which contains the execution sequences of representative phases.

4. **WCET Calculation**  
   Produces `wcet.txt` or the files for each benchmark, representing the **Worst-Case Execution Time** of each phase under a standard resource allocation.

5. **Theta Calculation**  
   Using precompiled C code in `calculate-thetas/`, the app computes `theta.txt` files that encode probabilistic execution behavior for each task phase, reflecting variations across cores and resource partitions.

**Outputs:**  
For each benchmark and resource allocation, the app generates:  
- `phases.txt`  
- `wcet.txt`  
- `theta.txt`  

This fully automates what previously required multiple manual steps in Python and C.

---

### 3. Taskset Generation

Once preprocessing is complete, the app allows the user to specify **taskset generation parameters**:

- **Target taskset utilization** (`target_util`) – total CPU utilization the taskset should achieve.  
- **Per-task utilization range** (`[min_util, max_util]`) – minimum and maximum utilization for individual tasks.  
- **Number of cores** (`num_cores`) – system cores available for scheduling.  
- **Maximum cache/memory bandwidth partitions** (`max_part`) – limits the partitioning for cache and memory bandwidth resources.  

**Outcome:**  
A fully constructed taskset outputted as a .csv file that satisfies user-specified utilization constraints and per-task limits, ready for scheduling experiments or simulations.

---

## Getting Started

# Prerequisites
- Node.js & npm
- Python 3.x (backend preprocessing scripts)
- Required Python and C dependencies (see /algorithms/DNA and /calculate-thetas)

# Installation
1) git clone https://github.com/EthanPoon25/cps-webapp.git
2) cd cps-webapp
3) npm install

# Running the App
npm start
npm run dev

The application will be available at http://localhost:3000/.

## Technologies Used

CPS Web App leverages a combination of **frontend, backend, and computational technologies** to automate taskset generation and benchmarking workflows. Below is an overview of the technologies used and their roles:

| Technology       | Type           | Purpose / Role |
|-----------------|----------------|----------------|
| **React**        | Frontend       | Builds the web-based user interface, handles user interactions, file uploads, and parameter inputs. |
| **Node.js**      | Backend        | Serves API requests, manages file uploads, orchestrates preprocessing and taskset generation pipelines. |
| **Python 3.x**   | Scripting      | Executes clustering and phase generation (DNA/RASCO algorithms), data processing, and preprocessing logic. |
| **C**            | Low-level computation | Computes theta values for each benchmark phase efficiently across cores and resource partitions. |
| **npm**          | Package Manager | Manages JavaScript dependencies and scripts for building and running the React frontend. |
| **HTML/CSS**     | Frontend       | Provides structure and styling for the web interface. |
| **JavaScript**   | Frontend Logic | Handles dynamic behavior, event listeners, and communication with backend APIs. |
| **ZIP Handling** | File Processing | Allows batch uploads of benchmark profile data for automated processing. |

---

## Credits

This project was developed with guidance and inspiration from the **Distributed Systems Lab** at the University of Pennsylvania. Special thanks to:  

- **Professor Linh Thi Xuan Phan**, University of Pennsylvania – conceived the project and provided foundational research and direction on real-time taskset analysis and clustering algorithms.
- **Abby Eisenklam**, PhD student, University of Pennsylvania – for mentorship, algorithmic guidance, and detailed documentation of the preprocessing and taskset generation workflow.

