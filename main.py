import sys
from PyQt5.QtWidgets import QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QPushButton, QLabel, QLineEdit, QTableWidget, QTableWidgetItem, QMessageBox
from pickle import dump, load
from math import factorial, comb


def arg(n, p):
    """Calculate arrangement A(n,p) = n!/(n-p)!"""
    result = 1
    for i in range(n, n - p, -1):
        result *= i
    return result


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Combinations and Arrangements Calculator")
        self.setGeometry(100, 100, 600, 400)
        
        # Create central widget and layout
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)
        
        # Input fields
        input_layout = QHBoxLayout()
        
        input_layout.addWidget(QLabel("n:"))
        self.n = QLineEdit()
        input_layout.addWidget(self.n)
        
        input_layout.addWidget(QLabel("p:"))
        self.p = QLineEdit()
        input_layout.addWidget(self.p)
        
        layout.addLayout(input_layout)
        
        # Buttons
        button_layout = QHBoxLayout()
        
        self.btn_fill = QPushButton("Fill/Calculate")
        self.btn_fill.clicked.connect(self.remplir)
        button_layout.addWidget(self.btn_fill)
        
        self.btn_display = QPushButton("Display")
        self.btn_display.clicked.connect(self.afficher)
        button_layout.addWidget(self.btn_display)
        
        layout.addLayout(button_layout)
        
        # Table widget
        self.tab = QTableWidget()
        self.tab.setColumnCount(3)
        self.tab.setHorizontalHeaderLabels(["n", "p", "Result"])
        layout.addWidget(self.tab)
    
    def remplir(self):
        """Fill data and save to file"""
        try:
            c = {}
            c['n'] = int(self.n.text())
            c['p'] = int(self.p.text())
            
            # Validate input
            if c['n'] < 0 or c['p'] < 0:
                QMessageBox.warning(self, "Error", "Values must be non-negative")
                return
            
            if c['p'] > c['n']:
                QMessageBox.warning(self, "Error", "p must be less than or equal to n")
                return
            
            # Calculate combination
            c['result'] = comb(c['n'], c['p'])
            
            # Save to file
            try:
                with open("tp2.dat", "ab") as f:
                    dump(c, f)
                QMessageBox.information(self, "info", "dn")
            except IOError as e:
                QMessageBox.critical(self, "Error", f"Failed to save data: {str(e)}")
        except ValueError:
            QMessageBox.warning(self, "Error", "Please enter valid integers")
    
    def afficher(self):
        """Display data from file"""
        try:
            # Clear existing rows
            self.tab.setRowCount(0)
            
            with open("tp2.dat", "rb") as f:
                l = 0
                while True:
                    try:
                        c = load(f)
                        self.tab.insertRow(l)
                        self.tab.setItem(l, 0, QTableWidgetItem(str(c['n'])))
                        self.tab.setItem(l, 1, QTableWidgetItem(str(c['p'])))
                        self.tab.setItem(l, 2, QTableWidgetItem(str(c['result'])))
                        l += 1
                    except EOFError:
                        break
        except FileNotFoundError:
            QMessageBox.warning(self, "Error", "File tp2.dat not found. Please fill data first.")
        except IOError as e:
            QMessageBox.critical(self, "Error", f"Failed to read data: {str(e)}")


if __name__ == "__main__":
    app = QApplication(sys.argv)
    windows = MainWindow()
    windows.show()
    sys.exit(app.exec_())
