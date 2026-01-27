# PyQt5 Combinations and Arrangements Calculator

A PyQt5 application for calculating combinations and arrangements, with data persistence using pickle.

## Features

- Calculate combinations C(n,p) using the math.comb function
- Calculate arrangements A(n,p) using a custom arg() function
- Save calculations to a binary file (tp2.dat)
- Display saved calculations in a table widget
- Input validation and error handling

## Requirements

- Python 3.x
- PyQt5

## Installation

```bash
pip install PyQt5
```

## Usage

Run the application:

```bash
python main.py
```

1. Enter values for `n` and `p` in the input fields
2. Click "Fill/Calculate" to calculate and save the combination
3. Click "Display" to view all saved calculations in the table

## Bug Fixes Applied

The following bugs were fixed in this application:

1. **Missing imports**: Added `from pickle import dump, load` and imported `comb` from `math`

2. **Fixed arg() function**: Moved the return statement outside the loop to calculate the complete arrangement value

3. **Fixed remplir() function**:
   - Corrected field reading: `c['p']=int(windows.p.text())` instead of reading from `n` twice
   - Fixed QMessageBox syntax: Changed to `QMessageBox.information(windows, "info", "dn")`

4. **Fixed afficher() function**:
   - Fixed typo: Changed `w.tab.isertRow(l)` to `self.tab.insertRow(l)` (corrected undefined `w` to `self` and typo `isertRow` to `insertRow`)
   - Moved `f.close()` outside the while loop (by using context manager `with` statement, file closes automatically after all records are read)

5. **Optional improvements added**:
   - Better error handling for file I/O with try-except blocks
   - Input validation to ensure non-negative values and p <= n
   - Used context managers (`with` statement) for proper file handling
   - Clear error messages for users

## File Structure

- `main.py` - Main application file containing the PyQt5 GUI and logic
- `tp2.dat` - Binary data file storing calculation results (created on first save)
- `.gitignore` - Git ignore file to exclude generated files
- `README.md` - This file
