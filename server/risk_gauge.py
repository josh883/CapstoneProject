# server/risk_gauge.py
import matplotlib.pyplot as plt
import numpy as np
import os # Included for project compatibility

def features(probability, file_path='risk_diagram.png'):
    """
    Generates a circular risk management gauge diagram.

    Args:
        probability (float): The likelihood of the trade prediction (0 to 100).
        file_path (str): The path to save the output image file.
    """
    if not (0 <= probability <= 100):
        raise ValueError("Probability must be between 0 and 100.")

    # Create the figure and axes for the plot
    # 'fig' is defined here.
    fig, ax = plt.subplots(figsize=(8, 8), subplot_kw={'projection': 'polar'})

    # Set the plot limits and direction
    ax.set_ylim(0, 1)
    ax.set_yticklabels([]) # Hide radial ticks
    ax.set_xticklabels([]) # Hide angular ticks
    ax.grid(False) # Hide grid lines
    ax.spines['polar'].set_visible(False) # Hide the outer circle spine

    # --- Create the background gauge with color zones ---
    # Define the zones: High Risk (Red), Medium Risk (Yellow), Low Risk (Green)
    zones = {
        'High Risk': (0, 35, 'red'),
        'Medium Risk': (35, 70, 'gold'),
        'Low Risk': (70, 100, 'green')
    }

    for name, (start, end, color) in zones.items():
        # Convert percentage to radians for the plot (180 degrees total)
        start_rad = np.deg2rad(180 - start * 1.8)
        end_rad = np.deg2rad(180 - end * 1.8)
        
        # Create a filled arc for each zone
        theta = np.linspace(start_rad, end_rad, 100)
        ax.fill_between(theta, 0.6, 1, color=color, alpha=0.7)

        # Add text labels for the zones
        label_angle = np.deg2rad(180 - (start + end) / 2 * 1.8)
        ax.text(label_angle, 0.78, name, rotation=np.rad2deg(label_angle) + 90,
                      ha='center', va='center', fontsize=12, fontweight='bold', color='white')

    # --- Create the needle ---
    angle = np.deg2rad(180 - probability * 1.8)
    ax.arrow(angle, 0, 0, 0.9,
              width=0.03, head_width=0.08, head_length=0.1,
              fc='black', ec='black', zorder=10)
    
    # Add a circle at the center
    ax.add_patch(plt.Circle((0, 0), 0.1, color='black', zorder=11))

    # --- Add central text ---
    ax.text(0, 0, f'{probability:.1f}%', ha='center', va='center',
              fontsize=28, fontweight='bold', color='black')
    ax.text(0, -0.3, 'Prediction\nLikelihood', ha='center', va='center',
              fontsize=16)

    # Set the title for the diagram
    ax.set_title("Trade Prediction Risk Assessment", fontsize=20, pad=20)
    
    # Save the figure to a file
    plt.savefig(file_path, bbox_inches='tight', transparent=True)
    
    # 'fig' is closed here, which is why it must be defined inside the function.
    plt.close(fig) 
    print(f"Risk diagram saved to {file_path}")