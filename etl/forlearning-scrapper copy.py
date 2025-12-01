from bs4 import BeautifulSoup
import requests
url = "
https://www.weg.net/catalog/weg/BR/pt/Tintas-e-Vernizes/c/TV"

#quotes = soup.find_all("div", attrs={"class": "product-tile-row"})
#authors = soup.find_all("a", attrs={"class": "xtt-url-categories"})

def data_scrape(url):
    headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://www.weg.net/",
    }

    response = requests.get(url, headers=headers)
    print(response.text)  # Check if it still says "Access Denied"
    soup = BeautifulSoup(response.content, 'html.parser')
    
    products = []

    for product in soup.find_all('div', class_='xtt-product-tile-row'):
        name = product.find('a', class_='xtt-url-categories').text.strip() if product.find('a', class_='xtt-url-categories') else 'No Name' #It's using the type of text and his class to find the product, if doesn't have one it returns 'No Name'
        #price = product.find('span', class_='andes-money-amount andes-money-amount--cents-superscript').text.strip() if product.find('span', class_='andes-money-amount andes-money-amount--cents-superscript') else 'No Price' # Same kind of thing from above

        #products.append((name, parse_price(price)))
        products.append((name))
        #print(name, price, " were scrapped")
        print(name," was scrapped")
    return products

data_scrape(url)