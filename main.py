import sys
from PyQt5.QtWidgets import QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QPushButton, QLabel, QLineEdit, QTableWidget, QTableWidgetItem, QMessageBox
from pickle import dump, load
from math import comb


def arg(n, p):
    result = 1
    for i in range(n, n - p, -1):
        result *= i
    return result


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Combinations and Arrangements Calculator")
        self.setGeometry(100, 100, 600, 400)
        
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)
        
        input_layout = QHBoxLayout()
        input_layout.addWidget(QLabel("n:"))
        self.n = QLineEdit()
        input_layout.addWidget(self.n)
        input_layout.addWidget(QLabel("p:"))
        self.p = QLineEdit()
        input_layout.addWidget(self.p)
        layout.addLayout(input_layout)
        
        button_layout = QHBoxLayout()
        self.btn_fill = QPushButton("Fill/Calculate")
        self.btn_fill.clicked.connect(self.remplir)
        button_layout.addWidget(self.btn_fill)
        self.btn_display = QPushButton("Display")
        self.btn_display.clicked.connect(self.afficher)
        button_layout.addWidget(self.btn_display)
        layout.addLayout(button_layout)
        
        self.tab = QTableWidget()
        self.tab.setColumnCount(3)
        self.tab.setHorizontalHeaderLabels(["n", "p", "Result"])
        layout.addWidget(self.tab)
    
    def remplir(self):
        try:
            c = {}
            c['n'] = int(self.n.text())
            c['p'] = int(self.p.text())
            c['result'] = comb(c['n'], c['p'])
            
            with open("tp2.dat", "ab") as f:
                dump(c, f)
            QMessageBox.information(self, "info", "dn")
        except:
            QMessageBox.warning(self, "Error", "Invalid input")
    
    def afficher(self):
        try:
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
        except:
            QMessageBox.warning(self, "Error", "Cannot read file")


if __name__ == "__main__":
    app = QApplication(sys.argv)
    windows = MainWindow()
    windows.show()
    sys.exit(app.exec_())
