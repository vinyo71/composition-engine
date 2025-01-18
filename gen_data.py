import random
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta

# Expanded Hungarian names, cities, and streets
hungarian_names = ["Nagy János", "Kovács Éva", "Tóth István", "Szabó Katalin", "Horváth Péter", 
                   "Kiss Mária", "Varga Ferenc", "Molnár Anna", "Németh László", "Balogh Erzsébet",
                   "Farkas Katalin", "Papp Zoltán", "Takács Zsuzsa", "Juhász Gábor", "Lakatos Eszter",
                   "Mészáros Attila", "Oláh Viktória", "Simon Balázs", "Rácz Judit", "Fekete Tamás"]

hungarian_cities = ["Budapest", "Debrecen", "Szeged", "Miskolc", "Pécs", "Győr", "Nyíregyháza", 
                    "Kecskemét", "Székesfehérvár", "Szombathely", "Eger", "Veszprém", "Zalaegerszeg", 
                    "Sopron", "Kaposvár", "Békéscsaba", "Tatabánya", "Szolnok", "Hódmezővásárhely", "Dunaújváros"]

street_names = ["Kossuth utca", "Petőfi utca", "Rákóczi út", "Ady Endre utca", "Dózsa György út", 
                "Árpád út", "Béke tér", "Széchenyi utca", "Deák Ferenc utca", "Bajcsy-Zsilinszky út",
                "Bartók Béla út", "József Attila utca", "Hunyadi János utca", "Jókai utca", "Arany János utca",
                "Szent István körút", "Váci utca", "Alkotmány utca", "Baross utca", "Damjanich utca"]

# Updated Hungarian transaction types
transaction_types = ["ATM készpénzfelvétel", "Fizetés", "Online vásárlás", "Közüzemi számla fizetés",
                     "Megtakarítási számlára utalás", "Készpénz befizetés", "Hitel törlesztés",
                     "Biztosítási díj fizetés", "Ajándék utalás", "Étkezési költség",
                     "Mobiltelefon számla", "Internetszolgáltatás díja", "Parkolási díj", "Üzemanyag vásárlás",
                     "Ruházati vásárlás", "Orvosi vizsgálat díja", "Könyv vásárlás", "Mozi jegy", "Utazási költség", "Sportfelszerelés vásárlás"]

def generate_iban():
    country_code = "HU"
    account_number = ''.join(random.choices("0123456789", k=24))
    return f"{country_code}{account_number}"

def generate_transactions():
    transactions = []
    for _ in range(random.randint(5, 15)):
        currency = random.choice(["HUF", "EUR"])
        amount = round(random.uniform(-500000, 500000), 2) if currency == "HUF" else round(random.uniform(-1500, 1500), 2)
        transaction = {
            "date": (datetime(2025, 1, 1) + timedelta(days=random.randint(0, 364))).isoformat(),
            "description": random.choice(transaction_types),
            "amount": amount,
            "currency": currency
        }
        transactions.append(transaction)
    return transactions

def generate_bank_statement():
    name = random.choice(hungarian_names)
    city = random.choice(hungarian_cities)
    street = random.choice(street_names)
    house_number = random.randint(1, 100)
    address = f"{city}, {street} {house_number}."
    
    return {
        "name": name,
        "address": address,
        "account_number": generate_iban(),
        "transactions": generate_transactions()
    }

def generate_xml_dataset(num_documents):
    root = ET.Element("BankStatements")

    for _ in range(num_documents):
        statement = generate_bank_statement()
        statement_element = ET.SubElement(root, "BankStatement")

        name_element = ET.SubElement(statement_element, "Name")
        name_element.text = statement["name"]

        address_element = ET.SubElement(statement_element, "Address")
        address_element.text = statement["address"]

        account_element = ET.SubElement(statement_element, "AccountNumber")
        account_element.text = statement["account_number"]

        transactions_element = ET.SubElement(statement_element, "Transactions")
        for transaction in statement["transactions"]:
            transaction_element = ET.SubElement(transactions_element, "Transaction")

            date_element = ET.SubElement(transaction_element, "Date")
            date_element.text = transaction["date"]

            description_element = ET.SubElement(transaction_element, "Description")
            description_element.text = transaction["description"]

            amount_element = ET.SubElement(transaction_element, "Amount")
            amount_element.text = str(transaction["amount"])

            currency_element = ET.SubElement(transaction_element, "Currency")
            currency_element.text = transaction["currency"]

    file_name = f"bank_statements_{num_documents}.xml"
    tree = ET.ElementTree(root)
    tree.write(file_name, encoding="utf-8", xml_declaration=True)
    return file_name

# Get dataset size from prompt
data_set_size = int(input("Enter the number of bank statements to generate: "))

# Generate XML dataset with the provided size
file_name = generate_xml_dataset(data_set_size)
print(f"XML dataset '{file_name}' has been generated.")