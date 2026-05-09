import json
import math

def fraction_to_decimal(frac_str):
    num, den = frac_str.split('/')
    return float(num) / float(den)

def in_to_mm(inches):
    return inches * 25.4

# Drill sizes
drill_sizes = []

# Number drills 1-80
number_drills = {
    80: 0.0135, 79: 0.0145, 78: 0.0160, 77: 0.0180, 76: 0.0200, 75: 0.0210, 74: 0.0225, 73: 0.0240, 72: 0.0250, 71: 0.0260,
    70: 0.0280, 69: 0.0292, 68: 0.0310, 67: 0.0320, 66: 0.0330, 65: 0.0350, 64: 0.0360, 63: 0.0370, 62: 0.0380, 61: 0.0390,
    60: 0.0400, 59: 0.0410, 58: 0.0420, 57: 0.0430, 56: 0.0465, 55: 0.0520, 54: 0.0550, 53: 0.0595, 52: 0.0635, 51: 0.0670,
    50: 0.0700, 49: 0.0730, 48: 0.0760, 47: 0.0785, 46: 0.0810, 45: 0.0820, 44: 0.0860, 43: 0.0890, 42: 0.0935, 41: 0.0960,
    40: 0.0980, 39: 0.0995, 38: 0.1015, 37: 0.1040, 36: 0.1065, 35: 0.1100, 34: 0.1110, 33: 0.1130, 32: 0.1160, 31: 0.1200,
    30: 0.1285, 29: 0.1360, 28: 0.1405, 27: 0.1440, 26: 0.1470, 25: 0.1495, 24: 0.1520, 23: 0.1540, 22: 0.1570, 21: 0.1590,
    20: 0.1610, 19: 0.1660, 18: 0.1695, 17: 0.1730, 16: 0.1770, 15: 0.1800, 14: 0.1820, 13: 0.1850, 12: 0.1890, 11: 0.1910,
    10: 0.1935, 9: 0.1960, 8: 0.1990, 7: 0.2010, 6: 0.2040, 5: 0.2055, 4: 0.2090, 3: 0.2130, 2: 0.2210, 1: 0.2280
}

# Letter drills A-Z
letter_drills = {
    'A': 0.234, 'B': 0.238, 'C': 0.242, 'D': 0.246, 'E': 0.250, 'F': 0.257, 'G': 0.261, 'H': 0.266, 'I': 0.272, 'J': 0.277,
    'K': 0.281, 'L': 0.290, 'M': 0.295, 'N': 0.302, 'O': 0.316, 'P': 0.323, 'Q': 0.332, 'R': 0.339, 'S': 0.348, 'T': 0.358,
    'U': 0.368, 'V': 0.377, 'W': 0.386, 'X': 0.397, 'Y': 0.404, 'Z': 0.413
}

for i in range(1, 65):
    frac_str = f"{i}/64"
    # simplify fraction
    gcd = math.gcd(i, 64)
    sim_frac = f"{i//gcd}/{64//gcd}"
    decimal = i / 64.0
    drill_sizes.append({"size": sim_frac, "decimalIn": round(decimal, 4), "decimalMm": round(in_to_mm(decimal), 3)})

for num, decimal in number_drills.items():
    drill_sizes.append({"size": f"#{num}", "decimalIn": round(decimal, 4), "decimalMm": round(in_to_mm(decimal), 3)})

for letter, decimal in letter_drills.items():
    drill_sizes.append({"size": letter, "decimalIn": round(decimal, 4), "decimalMm": round(in_to_mm(decimal), 3)})

# Sort drill sizes by decimal inch
drill_sizes.sort(key=lambda x: x["decimalIn"])

# Combine sizes that have same decimal (e.g. 1/4 and E are both .250, wait E is .250, 1/4 is .250)
unique_drills = []
for d in drill_sizes:
    if len(unique_drills) > 0 and abs(unique_drills[-1]["decimalIn"] - d["decimalIn"]) < 0.0001:
        unique_drills[-1]["size"] += " / " + d["size"]
    else:
        unique_drills.append(d)

drill_sizes = unique_drills

# Let's define the Cut Tap and Form Tap tables.
# I'll create a list of typical sizes and look up the drill size for them.
taps = [
    {"size": "#0-80 UNF", "cut": "3/64", "form": "#50"},
    {"size": "#1-64 UNC", "cut": "#53", "form": "#49"},
    {"size": "#1-72 UNF", "cut": "#53", "form": "#49"},
    {"size": "#2-56 UNC", "cut": "#50", "form": "#44"},
    {"size": "#2-64 UNF", "cut": "#50", "form": "#44"},
    {"size": "#3-48 UNC", "cut": "#47", "form": "#39"},
    {"size": "#3-56 UNF", "cut": "#45", "form": "#38"},
    {"size": "#4-40 UNC", "cut": "#43", "form": "#33"},
    {"size": "#4-48 UNF", "cut": "#42", "form": "#30"},
    {"size": "#5-40 UNC", "cut": "#38", "form": "#30"},
    {"size": "#5-44 UNF", "cut": "#37", "form": "#29"},
    {"size": "#6-32 UNC", "cut": "#36", "form": "#28"},
    {"size": "#6-40 UNF", "cut": "#33", "form": "#24"},
    {"size": "#8-32 UNC", "cut": "#29", "form": "#18"},
    {"size": "#8-36 UNF", "cut": "#29", "form": "#17"},
    {"size": "#10-24 UNC", "cut": "#25", "form": "#11"},
    {"size": "#10-32 UNF", "cut": "#21", "form": "#6"},
    {"size": "#12-24 UNC", "cut": "#16", "form": "#2"},
    {"size": "#12-28 UNF", "cut": "#14", "form": "1"},
    {"size": "1/4-20 UNC", "cut": "#7", "form": "1"},
    {"size": "1/4-28 UNF", "cut": "#3", "form": "B"},
    {"size": "5/16-18 UNC", "cut": "F", "form": "J"},
    {"size": "5/16-24 UNF", "cut": "I", "form": "L"},
    {"size": "3/8-16 UNC", "cut": "5/16", "form": "S"},
    {"size": "3/8-24 UNF", "cut": "Q", "form": "U"},
    {"size": "7/16-14 UNC", "cut": "U", "form": "X"},
    {"size": "7/16-20 UNF", "cut": "25/64", "form": "Z"},
    {"size": "1/2-13 UNC", "cut": "27/64", "form": "29/64"},
    {"size": "1/2-20 UNF", "cut": "29/64", "form": "31/64"},
    {"size": "9/16-12 UNC", "cut": "31/64", "form": "33/64"},
    {"size": "9/16-18 UNF", "cut": "33/64", "form": "35/64"},
    {"size": "5/8-11 UNC", "cut": "17/32", "form": "37/64"},
    {"size": "5/8-18 UNF", "cut": "37/64", "form": "39/64"},
    {"size": "3/4-10 UNC", "cut": "21/32", "form": "11/16"},
    {"size": "3/4-16 UNF", "cut": "11/16", "form": "23/32"},
    {"size": "7/8-9 UNC", "cut": "49/64", "form": "51/64"},
    {"size": "7/8-14 UNF", "cut": "13/16", "form": "53/64"},
    {"size": "1\"-8 UNC", "cut": "7/8", "form": "59/64"},
    {"size": "1\"-12 UNF", "cut": "59/64", "form": "61/64"},
    {"size": "1\"-14 UNF", "cut": "15/16", "form": "31/32"},
    {"size": "M2.5 x 0.45", "cut": "#46", "form": "#41"},
    {"size": "M3 x 0.5", "cut": "#39", "form": "#36"},
    {"size": "M4 x 0.7", "cut": "#30", "form": "#24"},
    {"size": "M5 x 0.8", "cut": "#19", "form": "#14"},
    {"size": "M6 x 1.0", "cut": "#9", "form": "#1"},
    {"size": "M8 x 1.25", "cut": "17/64", "form": "L"},
    {"size": "M10 x 1.5", "cut": "11/32", "form": "U"},
    {"size": "M10 x 1.25", "cut": "11/32", "form": "3/8"},
    {"size": "M12 x 1.75", "cut": "13/32", "form": "29/64"},
    {"size": "M12 x 1.25", "cut": "27/64", "form": "15/32"},
    {"size": "M14 x 2.0", "cut": "15/32", "form": "33/64"},
    {"size": "M14 x 1.5", "cut": "1/2", "form": "17/32"},
    {"size": "M16 x 2.0", "cut": "35/64", "form": "39/64"},
    {"size": "M16 x 1.5", "cut": "37/64", "form": "5/8"},
    {"size": "M18 x 2.5", "cut": "39/64", "form": "11/16"},
    {"size": "M18 x 1.5", "cut": "21/32", "form": "11/16"},
    {"size": "M20 x 2.5", "cut": "11/16", "form": "49/64"},
    {"size": "M20 x 1.5", "cut": "23/32", "form": "3/4"},
    {"size": "M22 x 2.5", "cut": "49/64", "form": "53/64"},
    {"size": "M22 x 1.5", "cut": "13/16", "form": "27/32"},
    {"size": "M24 x 3.0", "cut": "53/64", "form": "7/8"},
    {"size": "M24 x 2.0", "cut": "7/8", "form": "59/64"}
]

cut_taps = []
form_taps = []

# Fetch decimal equivalent for drills
def get_dec(d_size):
    for d in drill_sizes:
        if d_size in d["size"].split(' / '):
            return d["decimalIn"], d["decimalMm"]
    return 0, 0

for t in taps:
    type_tag = "Metric" if t["size"].startswith("M") else "Imperial"
    
    cut_d = t["cut"]
    form_d = t["form"]
    c_in, c_mm = get_dec(cut_d)
    f_in, f_mm = get_dec(form_d)
    
    cut_taps.append({
        "size": t["size"],
        "type": type_tag,
        "drill": cut_d,
        "decimalIn": c_in,
        "decimalMm": c_mm
    })
    
    form_taps.append({
        "size": t["size"],
        "type": type_tag,
        "drill": form_d,
        "decimalIn": f_in,
        "decimalMm": f_mm
    })

class_2b_threads = [
    {"size": "4-40 UNC", "drill": "#43", "minorMin": 0.0849, "minorMax": 0.0939, "pitchMin": 0.0958, "pitchMax": 0.0991},
    {"size": "6-32 UNC", "drill": "#36", "minorMin": 0.1042, "minorMax": 0.1143, "pitchMin": 0.1177, "pitchMax": 0.1214},
    {"size": "8-32 UNC", "drill": "#29", "minorMin": 0.1302, "minorMax": 0.1389, "pitchMin": 0.1437, "pitchMax": 0.1475},
    {"size": "10-24 UNC", "drill": "#25", "minorMin": 0.1350, "minorMax": 0.1494, "pitchMin": 0.1629, "pitchMax": 0.1672},
    {"size": "10-32 UNF", "drill": "#21", "minorMin": 0.1562, "minorMax": 0.1643, "pitchMin": 0.1697, "pitchMax": 0.1736},
    {"size": "1/4-20 UNC", "drill": "#7", "minorMin": 0.1960, "minorMax": 0.2070, "pitchMin": 0.2175, "pitchMax": 0.2224},
    {"size": "1/4-28 UNF", "drill": "#3", "minorMin": 0.2110, "minorMax": 0.2200, "pitchMin": 0.2268, "pitchMax": 0.2311},
    {"size": "5/16-18 UNC", "drill": "F", "minorMin": 0.2520, "minorMax": 0.2650, "pitchMin": 0.2764, "pitchMax": 0.2817},
    {"size": "5/16-24 UNF", "drill": "I", "minorMin": 0.2670, "minorMax": 0.2770, "pitchMin": 0.2854, "pitchMax": 0.2902},
    {"size": "3/8-16 UNC", "drill": "5/16", "minorMin": 0.3070, "minorMax": 0.3210, "pitchMin": 0.3344, "pitchMax": 0.3401},
    {"size": "3/8-24 UNF", "drill": "Q", "minorMin": 0.3300, "minorMax": 0.3400, "pitchMin": 0.3479, "pitchMax": 0.3528},
    {"size": "1/2-13 UNC", "drill": "27/64", "minorMin": 0.4170, "minorMax": 0.4340, "pitchMin": 0.4500, "pitchMax": 0.4565},
    {"size": "1/2-20 UNF", "drill": "29/64", "minorMin": 0.4460, "minorMax": 0.4570, "pitchMin": 0.4675, "pitchMax": 0.4731}
]

js_content = f"""// Auto-generated Dashboard Data

const dashboardData = {{
    drillSizes: {json.dumps(drill_sizes, indent=4)},
    cutTapSizes: {json.dumps(cut_taps, indent=4)},
    formTapSizes: {json.dumps(form_taps, indent=4)},
    class2bThreads: {json.dumps(class_2b_threads, indent=4)}
}};

export default dashboardData;
"""

with open('/home/logan/Workspace/website/cnc/cnc-dashboard/dashboard-data.js', 'w') as f:
    f.write(js_content)

print("Generated dashboard-data.js")
