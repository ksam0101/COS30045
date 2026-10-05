# Appliance Energy Consumption Website

COS30045 Data Visualisation · Exercise 0.2 (build the website) and Exercise 3 (communicating data insights)
Author: **Tran Ngo Anh Khoi**

A three-page website that tells the story of how much energy the televisions sold in Australia use, built from the Australian Energy Rating TV register.

Website link: https://ksam0101.github.io/COS30045/

## Pages and structure

```
/
├── index.html          Home: intro, live "at a glance" numbers, FAQ accordion
├── televisions.html    Data story (storyboard, 6 charts), recommendation, energy calculator
├── about.html          About the project, data story, about the data, AI declaration
├── assets/
│   ├── css/style.css   All styling (external CSS, logo colours)
│   ├── js/
│   │   ├── main.js        footer year, mobile menu, FAQ accordion
│   │   ├── data.js        CSV loading, cleaning, filtering (mirrors the KNIME workflow)
│   │   ├── charts.js      SVG charts + data-driven text (no external libraries)
│   │   └── calculator.js  Interactive Appliance Energy Calculator (vanilla JS)
│   ├── img/logo.png    Provided power logo
│   └── data/           Put tv_2026_09_28.csv here
└── README.md
```

### Run it

1. `tv_2026_09_28.csv` is already in `assets/data/` (replace it if you export a newer file).
2. Serve the folder over HTTP (browsers block `fetch` of local files), for example `python3 -m http.server 8000` and open `http://localhost:8000`. On the Swinburne Mercury Apache server it works as it is once the CSV is uploaded.
3. If the CSV is missing, each page shows a "Data file needed" box with a file picker so the charts can still be previewed.

## Exercise 0.2 requirement checklist

| Requirement | Where |
|---|---|
| Three HTML pages: Home, Televisions, About Us | `index.html`, `televisions.html`, `about.html` |
| Top navigation on all pages, moves between all pages | `<header>` on every page |
| Provided power logo top-left, links to Home | `.brand` link in the header |
| Mouse-over (hover) effect | `.nav-links a:hover`, logo tilt, buttons, FAQ questions (`style.css`) |
| Current page clearly indicated | `aria-current="page"` styled as a filled pill |
| Home placeholder content on appliance energy in Australia | "Why household appliance energy matters" |
| FAQ hidden by default, accordion, uses JavaScript | `#faq` on Home, `main.js` |
| All styling in an external CSS file | `assets/css/style.css` (no inline layout styles) |
| Colours consistent with the logo | cream `#FAE8A4`, amber `#EEA944`, brown `#7D6847` |
| Consistent styling on every page | one shared stylesheet |
| Footer on all pages: current year, name, GenAI acknowledgement | `<footer>`; the year comes from JavaScript |
| Folder structure `assets/css`, `js`, `img`, README | as above |
| Optional calculator (vanilla JS) | `televisions.html#calculator`, `calculator.js` |
| Generative AI Reflection section | end of this README |

### Calculator details
Inputs: power in watts (or an example TV preset), hours per day, price in cents per kWh, all through form controls. It computes daily, monthly and yearly kWh plus monthly and yearly cost, all client-side. Results appear in the page (no alerts), and the same elements are updated rather than duplicated. Missing, non-numeric and out-of-range inputs show a message next to the field and in the results panel. Defaults are filled on load, so it works after a refresh.

## Data Story

**Audience.** Australian households buying or replacing a TV. They are non-technical and price-conscious, and want to know what changes the running cost so they can choose quickly.

**What they want to know.**
1. How much does screen size change energy use?
2. Does a higher star rating mean lower energy use?
3. Does screen technology matter?
4. What would my TV cost to run?

**Guidelines for the story.** Plain language; one message per chart; the same colour for the same size group everywhere (Small = light gold, Medium = amber, Large = brown); always show sample sizes; end with a recommendation and a calculator.

**Storyboard.**

| # | Note | Evidence |
|---|---|---|
| 1 | **Issue:** a TV runs for years, so energy use is a hidden running cost | intro text |
| 2 | **What is on the shelves?** | bar chart of top brands, histogram of screen sizes |
| 3 | **Size drives energy** | scatter plot and average by size group |
| 4 | **Do stars help?** | grouped bars by star band within size group; high-star (5★+) vs below |
| 5 | **Does technology matter?** | grouped bars by screen technology and size group |
| 6 | **Recommendation:** pick the size you need, compare stars, check technology, calculate | recommendation cards and calculator |

Every number in the story text is calculated from the CSV when the page loads, so the wording always matches the data.

## About the data

### Data source
Australian Government Energy Rating program (GEMS regulator), register of televisions:
- <https://www.energyrating.gov.au/about-us/gems-regulator/registered-appliance-and-equipment-data>
- <https://reg.energyrating.gov.au/comparator/product_types/32/search/>

File used: `tv_2026_09_28.csv`, exported on 28 September 2026 according to its file name. One row per registered TV model (brand, model, screen size in cm, screen technology, star rating, labelled energy consumption in kWh per year, availability and so on).

### Data processing
Designed first in KNIME (`Workflows of Exercise 1 & 2`), then repeated in `assets/js/data.js`:
1. Read the CSV (quoted fields supported).
2. Clean whitespace in `Brand_Reg`, `SoldIn` and `Availability Status` (String Cleaner).
3. Merge brand spelling variants regardless of case and replace "Samsung Electronics" with "Samsung" (String Replacer, extended: the data has SAMSUNG, Samsung and SAMSUNG ELECTRONICS, and three spellings of Kogan).
4. Keep `Availability Status = Available` (Row Filter).
5. Keep rows whose `SoldIn` includes Australia (Row Filter). The KNIME filter matched `Australia` exactly (365 rows), but most models are registered as e.g. `Australia,New Zealand`, so the site uses a "contains" match (4,845 rows). Set `soldInMatch` to `'exact'` in `data.js` to reproduce the KNIME result.
6. `screensize_inch = screensize / 2.54` (Expression).
7. Size group: Small under 43", Medium 43" to 65" inclusive, Large over 65" (Expression).
8. Drop rows with a missing or invalid size, technology, brand or energy value; the counts of rows read, kept and dropped are shown on the Televisions page.
9. Summarise with counts and means by brand, size group, star band and technology (GroupBy and Pivot).

Where a technology has no models in a size group, the chart leaves a gap. The KNIME workflow filled such gaps with the column mean, but inventing a value would mislead readers.

### Privacy
The register describes products, not people, and contains no personal information. The site has no cookies, analytics or accounts. Calculator inputs stay in the browser. A CSV chosen with the file picker is read locally and, at most, kept in the tab's session storage until the tab closes.

### Accuracy and limitations
- Energy figures are labelled estimates, not measured real-world use.
- The register is self-reported by suppliers.
- It is a snapshot from a single export date.
- Counts are models, not units sold.
- Models registered for Australia plus New Zealand/Fiji are included, even though the register does not show how many are stocked in Australia.
- The `Star` column is almost entirely `N/A`, so `Star2` is used for star ratings; "high" means 5★ or more (a setting in `data.js`).
- The 43" and 65" cut-offs are a design choice.
- Averages from few models are unreliable, so sample sizes are shown and small groups are left out of the written notes.
- Means hide spread (see the scatter plot), and correlation is not causation.

### Ethics
Brands are described neutrally, not ranked as good or bad. Every filter and cut-off is disclosed. Bar charts start at zero and use a single consistent colour code. The calculator is an estimate, not financial advice. The site is keyboard accessible with visible focus, text alternatives and tooltips as well as colour. The data belongs to the Energy Rating program and is credited. Check its licence terms before reuse.

## AI Declaration
- I created this Website by ClaudeAI with the real data that I found in the real Website of Australia 
- The dataset come from: https://reg.energyrating.gov.au/comparator/product_types/32/search/?expired_products=on


