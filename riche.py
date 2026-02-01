import os
import sys
from PyQt5 import QtCore, QtWidgets, uic
from PyQt5.QtWidgets import QMessageBox, QTableWidgetItem

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
NOMBRES_PATH = os.path.join(BASE_DIR, "nombres.txt")
RICHE_PATH = os.path.join(BASE_DIR, "riche.dat")


def factorization_text(number):
    remaining = number
    factor = 2
    parts = []
    rich = False

    while factor * factor <= remaining:
        if remaining % factor == 0:
            count = 0
            while remaining % factor == 0:
                remaining //= factor
                count += 1
            if count >= 2:
                rich = True
            if count == 1:
                parts.append(f"{factor}")
            else:
                parts.append(f"{factor}²" if count == 2 else f"{factor}^{count}")
        factor += 1 if factor == 2 else 2

    if remaining > 1:
        parts.append(str(remaining))

    if not parts:
        parts.append(str(number))

    return "×".join(parts), rich


class RichesApp(QtWidgets.QMainWindow):
    def __init__(self):
        super().__init__()
        uic.loadUi(os.path.join(BASE_DIR, "Interfaceriches.ui"), self)

        self.ajouter1Button.clicked.connect(self.ajouter1)
        self.afficher1Button.clicked.connect(self.afficher1)
        self.ajouter2Button.clicked.connect(self.ajouter2)
        self.afficher2Button.clicked.connect(self.afficher2)

        self.richeTableWidget.setColumnCount(3)
        self.richeTableWidget.setHorizontalHeaderLabels(["num", "facteur", "nature"])
        self.richeTableWidget.horizontalHeader().setStretchLastSection(True)
        self.richeTableWidget.horizontalHeader().setSectionResizeMode(QtWidgets.QHeaderView.Stretch)

    def show_error(self, message):
        QMessageBox.critical(self, "Erreur", message)

    def show_info(self, message):
        QMessageBox.information(self, "Information", message)

    def ajouter1(self):
        text = self.numberLineEdit.text().strip()
        if not text:
            self.show_error("La zone de saisie est vide. Veuillez entrer un nombre.")
            return

        try:
            number = int(text)
        except ValueError:
            self.show_error("Erreur lors de la conversion en entier.")
            return

        if number <= 1:
            self.show_error("Le nombre doit être supérieur à 1.")
            return

        try:
            with open(NOMBRES_PATH, "a", encoding="utf-8") as file:
                file.write(f"{number}\n")
        except OSError:
            self.show_error("Erreur lors de l'accès au fichier nombres.txt.")
            return

        self.numberLineEdit.clear()

    def afficher1(self):
        self.nombresListWidget.clear()
        try:
            with open(NOMBRES_PATH, "r", encoding="utf-8") as file:
                for line in file:
                    value = line.strip()
                    if value:
                        self.nombresListWidget.addItem(value)
        except FileNotFoundError:
            self.show_error("Le fichier nombres.txt est introuvable.")
        except OSError:
            self.show_error("Erreur lors de l'accès au fichier nombres.txt.")

    def ajouter2(self):
        try:
            with open(NOMBRES_PATH, "r", encoding="utf-8") as file:
                numbers = [line.strip() for line in file if line.strip()]
        except FileNotFoundError:
            self.show_error("Le fichier nombres.txt est introuvable.")
            return
        except OSError:
            self.show_error("Erreur lors de l'accès au fichier nombres.txt.")
            return

        records = []
        for text in numbers:
            try:
                number = int(text)
            except ValueError:
                continue
            factors_text, is_rich = factorization_text(number)
            nature = "riche" if is_rich else "non riche"
            records.append((number, factors_text, nature))

        try:
            with open(RICHE_PATH, "w", encoding="utf-8") as file:
                for number, factors_text, nature in records:
                    file.write(f"{number};{factors_text};{nature}\n")
        except OSError:
            self.show_error("Erreur lors de l'accès au fichier riche.dat.")
            return

        self.show_info("Le fichier riche.dat a été créé avec succès.")

    def afficher2(self):
        self.richeTableWidget.setRowCount(0)
        try:
            with open(RICHE_PATH, "r", encoding="utf-8") as file:
                lines = [line.strip() for line in file if line.strip()]
        except FileNotFoundError:
            self.show_error("Le fichier riche.dat est introuvable.")
            return
        except OSError:
            self.show_error("Erreur lors de l'accès au fichier riche.dat.")
            return

        self.richeTableWidget.setRowCount(len(lines))
        for row_index, line in enumerate(lines):
            parts = line.split(";")
            if len(parts) != 3:
                continue
            for col_index, value in enumerate(parts):
                item = QTableWidgetItem(value)
                item.setFlags(item.flags() ^ QtCore.Qt.ItemIsEditable)
                self.richeTableWidget.setItem(row_index, col_index, item)


if __name__ == "__main__":
    app = QtWidgets.QApplication(sys.argv)
    window = RichesApp()
    window.show()
    sys.exit(app.exec_())
