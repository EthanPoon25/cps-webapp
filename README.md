# CPS Web App

CPS Web App is a **React-based web application** designed to automate the preprocessing and taskset generation workflow for benchmark profile data. It integrates advanced algorithms such as **RASCO** and **DNA** to process execution profiles, generate phases, compute WCET and theta values, and automatically construct tasksets according to user-specified utilization and resource constraints.  

This application removes the need for manually running multiple Python and C scripts, simplifying the process for researchers and developers in real-time systems.

---

## Features

### 1. Algorithm Selection
The app allows the user to select the algorithm that drives the preprocessing step:

- **RASCO** – Resource-Aware Scheduling & Clustering Optimization  
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
   Produces `wcet.txt` files for each benchmark, representing the **Worst-Case Execution Time** of each phase under a standard resource allocation.

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

**Generation Algorithm:**

1. Initialize `remaining_util = target_util`.  
2. While `remaining_util > 0`:
   - Create a new **task object** with fields:  
     - `id` – sequential integer identifier.  
     - `name` – benchmark assigned to the task.  
     - `utilization` – randomly selected within `[min_util, max_util]`, capped by `remaining_util`.  
     - `period` – calculated as:  
       \[
       \text{period} = \frac{\text{wcet}}{\text{utilization}}
       \]
   - Randomly assign a benchmark from the set of processed benchmarks.  
   - Look up the task’s WCET from the corresponding `wcet.txt` using a **standard resource allocation** (`cache = membw = max_part / num_cores`).  
   - Reduce `remaining_util` by the task's utilization.  
3. Save the final collection of task objects as the **taskset**, which can be exported in any convenient format.

**Outcome:**  
A fully constructed taskset that satisfies user-specified utilization constraints and per-task limits, ready for scheduling experiments or simulations.

---

## Getting Started

### Prerequisites
Before running the CPS Web App, ensure you have the following installed:

- **Node.js & npm** – for running the frontend and managing dependencies.  
- **Python 3.x** – required for backend preprocessing scripts.  
- **Python/C dependencies** – as defined in the backend setup scripts (`/algorithms/DNA` and `/calculate-thetas`).

---

### Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/EthanPoon25/cps-webapp.git
cd cps-webapp
npm install
npm install react@19.1.0 react-dom@19.1.0 react-scripts@5.0.1 --save

``````
#### Run npm run dev on your command line (to run the backend first)
#### Run npm start (to run the application frontend and allow the front end to run on a different port)

---

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

This project was developed under the guidance of the **Distributed Systems Lab** at the University of Pennsylvania.  

- **Professor Linh Thi Xuan Phan**, University of Pennsylvania – conceived the project and provided foundational research and direction on real-time taskset analysis and clustering algorithms.  
- **Abby Eisenklam**, PhD student, University of Pennsylvania – provided mentorship, algorithmic guidance, and detailed documentation of the preprocessing and taskset generation workflow.
