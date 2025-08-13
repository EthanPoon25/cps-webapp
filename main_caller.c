#include <stdio.h>
#include <stdlib.h>
#include "workload_calculator.h"
#include "parsec_workload.h"

// Example of how to call your functions from a separate file
int main(int argc, char **argv)
{
    printf("Starting workload analysis...\n");
    
    // Example 1: Process all cache/membw combinations for FFT
    if (process_all_tasks(FFT) != 0) {
        printf("Error processing FFT tasks\n");
        return 1;
    }
    
    // Example 2: Get specific phase entries
    phase_entry_t *phase_entries = get_phase_entries(2, 3, CANNEAL);
    if (phase_entries) {
        printf("Successfully retrieved phase entries for CANNEAL (cache=2, membw=3)\n");
        // Process phase_entries as needed
    }
    
    // Example 3: Get theta entries
    phase_entry_t *theta_entries = get_theta_entries(1, 2, DEDUP);
    if (theta_entries) {
        printf("Successfully calculated theta entries for DEDUP (cache=1, membw=2)\n");
        // Process theta_entries as needed
    }
    
    // Example 4: Get specific sub-entry
    phase_entry_t *sub_entry = get_theta_sub_entries(0, 1, STREAMCLUSTER, 5);
    if (sub_entry) {
        printf("Retrieved sub-entry index 5 for STREAMCLUSTER (cache=0, membw=1)\n");
        printf("Entry task_id: %u, phase_idx: %u\n", sub_entry->task_id, sub_entry->phase_idx);
    }
    
    // Clean up allocated memory
    free_data();
    
    printf("Workload analysis complete.\n");
    return 0;
}