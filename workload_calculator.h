#ifndef WORKLOAD_CALCULATOR_H
#define WORKLOAD_CALCULATOR_H

#include <stdint.h>
#include <stdlib.h>
#include "parsec_workload.h"
#include <assert.h>

#ifdef __cplusplus
extern "C" {
#endif

#ifdef _WIN32
#define DLL_EXPORT __declspec(dllexport)
#else
#define DLL_EXPORT
#endif

// Function declarations for the exported functions
DLL_EXPORT void free_data(void);
DLL_EXPORT phase_entry_t *get_phase_entries(size_t cache, size_t membw, enum task_name name);
DLL_EXPORT phase_entry_t *get_theta_entries(size_t cache, size_t membw, enum task_name name);
DLL_EXPORT phase_entry_t *get_theta_sub_entries(size_t cache, size_t membw, enum task_name name, size_t idx);

// Additional utility function to process all tasks (like your main function)
DLL_EXPORT int process_all_tasks(enum task_name task);

#ifdef __cplusplus
}
#endif

#endif // WORKLOAD_CALCULATOR_H