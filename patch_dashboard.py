import re

with open('frontend/src/components/DashboardOficial.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(
    "const key = urlObj.pathname.substring(1);",
    "const key = decodeURIComponent(urlObj.pathname.substring(1));"
)

with open('frontend/src/components/DashboardOficial.jsx', 'w', encoding='utf-8') as f:
    f.write(c)
