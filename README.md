# ☕ Bobcafe Online Menu

A modern, responsive, mobile-first online café menu built for **Bobcafe**.

Designed with a clean UI, optimized for **Persian (RTL)** users, and powered by a dynamic JSON-based menu system.

## ✨ Features

* 📱 Mobile-first responsive design
* 🌙 Automatic Light/Dark mode support
* 🔎 Live search
* 🏷️ Dynamic category filtering
* 📦 Menu data loaded from JSON
* 🖼️ Lazy-loaded images
* ⚡ Fast and lightweight
* ♿ Accessible and semantic HTML
* 🇮🇷 Fully RTL and Persian-friendly
* 🎨 Modern café-inspired interface

## 📁 Project Structure

```text
.
├── index.html
└── assets/
    ├── css/
    │   └── style.css
    ├── js/
    │   └── app.js
    ├── images/
    └── menu.json
```

## 📄 Menu Data

All menu items are stored inside:

```text
/assets/menu.json
```

Images are loaded from:

```text
/assets/images/
```

Example item:

```json
{
  "name": "لاته",
  "description": "قهوه اسپرسو با شیر بخار داده شده",
  "price": 145000,
  "category": "نوشیدنی گرم",
  "image": "latte.jpg"
}
```

To add a new item, simply:

1. Add the image to `assets/images/`
2. Add a new object to `assets/menu.json`

No changes to the HTML or JavaScript are required.

## 🚀 Getting Started

Clone the repository:

```bash
git clone https://github.com/your-username/bobcafe-online-menu.git
```

Open `index.html` in your browser, or serve the project with a local web server.

> **Note:** Because the menu is loaded using `fetch()`, running the project through a local web server is recommended to avoid browser restrictions on local file access.

## 🛠️ Built With

* HTML5
* CSS3
* Vanilla JavaScript (ES6+)

No external frameworks or libraries required.

## 📱 Responsive

The website is optimized for:

* Mobile phones
* Tablets
* Desktop browsers

## 📜 License

This project is available under the MIT License.
