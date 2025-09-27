import json
from collections import OrderedDict
import time
import sys

def sort_cycles_in_floats(data):
    """
    Sort cycle numbers within each float ID in the JSON structure.
    Optimized for large files (90k+ lines).
    
    Args:
        json_file_path (str): Path to the input JSON file
        output_file_path (str): Path for the output file (optional)
    
    Returns:
        dict: The sorted data structure
    """
    sorted_data = {}
    total_locations = len(data)
    total_floats = 0
    total_cycles = 0
    
    print(f"Found {total_locations} location(s) to process...")
    
    for location_idx, (location, floats) in enumerate(data.items(), 1):
        print(f"Processing location {location_idx}/{total_locations}: '{location}'")
        sorted_data[location] = {}
        
        float_count = len(floats)
        total_floats += float_count
        print(f"  Found {float_count} float(s) in '{location}'")
        
        # Process each float ID (dynamically handles any float ID)
        for float_idx, (float_id, cycles) in enumerate(floats.items(), 1):
            if float_idx % 100 == 0 or float_idx == float_count:
                print(f"    Processing float {float_idx}/{float_count}: {float_id}")
            
            # Sort cycles by converting keys to integers for numerical sorting
            cycle_count = len(cycles)
            total_cycles += cycle_count
            
            # Get cycle numbers for sorting
            cycle_numbers = list(cycles.keys())
            try:
                # Sort numerically (handles cycle numbers like "1", "5", "35", etc.)
                sorted_cycle_numbers = sorted(cycle_numbers, key=int)
            except ValueError:
                # Fallback to string sorting if non-numeric cycles found
                print(f"    Warning: Non-numeric cycle numbers in float {float_id}. Using string sort.")
                sorted_cycle_numbers = sorted(cycle_numbers)
            
            # Rebuild with sorted cycles
            sorted_cycles = OrderedDict()
            for cycle_num in sorted_cycle_numbers:
                sorted_cycles[cycle_num] = cycles[cycle_num]
            
            sorted_data[location][float_id] = sorted_cycles
    
    return sorted_data

def sort_cycles_from_data(data):
    """
    Sort cycle numbers within each float ID from data already loaded in memory.
    
    Args:
        data (dict): The JSON data structure
    
    Returns:
        dict: The sorted data structure
    """
    
    # Process each location
    sorted_data = {}
    
    for location, floats in data.items():
        sorted_data[location] = {}
        
        # Process each float ID
        for float_id, cycles in floats.items():
            # Sort cycles by converting keys to integers, then back to strings
            sorted_cycles = OrderedDict()
            
            # Get cycle numbers as integers for proper numerical sorting
            cycle_numbers = list(cycles.keys())
            try:
                # Sort numerically
                sorted_cycle_numbers = sorted(cycle_numbers, key=int)
            except ValueError:
                # If conversion to int fails, sort as strings
                print(f"Warning: Non-numeric cycle numbers found in float {float_id}. Sorting as strings.")
                sorted_cycle_numbers = sorted(cycle_numbers)
            
            # Rebuild the ordered dictionary with sorted cycles
            for cycle_num in sorted_cycle_numbers:
                sorted_cycles[cycle_num] = cycles[cycle_num]
            
            sorted_data[location][float_id] = sorted_cycles
    
    return sorted_data
