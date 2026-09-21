with open('frontend/src/components/FormularioProveedor.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Get the EXACT text from the file itself using index positions
idx = c.find("handleRemoveList('accionistas', idx)")
snippet = c[idx:idx+700]

# Build old text from file using exact characters
old_text_start = snippet.find(")}\n                                </div>\n\n\n\n")
exact_old = snippet[old_text_start:old_text_start+350]
# Trim to just the h4 line closing
h4_end = exact_old.find("</h4>")
exact_old = exact_old[:h4_end+5]
print("Will replace:")
print(repr(exact_old))
print()

# Build new text  
new_text = (
    ")}\n"
    "                                    </>)}\n"
    "                                </div>\n"
    "\n"
    "                                <h4 style={{ margin: '2rem 0 1rem 0', color: 'var(--text-main)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>"
    "Persona Expuesta P\u00fablicamente (persona expuesta p\u00fablicamente)</h4>"
)

if exact_old in c:
    c = c.replace(exact_old, new_text, 1)
    print("REPLACED OK")
else:
    print("STILL NOT FOUND - trying with 3 newlines...")
    # Try with \r\n
    exact_old2 = exact_old.replace('\n', '\r\n')
    if exact_old2 in c:
        c = c.replace(exact_old2, new_text, 1)
        print("REPLACED WITH CRLF OK")
    else:
        print("FAILED")

with open('frontend/src/components/FormularioProveedor.jsx', 'w', encoding='utf-8') as f:
    f.write(c)
