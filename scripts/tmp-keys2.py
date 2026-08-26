import io

p = 'src/lib/i18n/messages/en.ts'
s = io.open(p, encoding='utf-8', newline='').read()
NL = '\r\n' if '\r\n' in s else '\n'

def add_after(anchor, block):
    global s
    a = anchor.replace('\n', NL)
    assert s.count(a) == 1, 'anchor: %r' % anchor[:60]
    s = s.replace(a, a + block.replace('\n', NL))

if 'baEmptySearch' not in s:
    add_after("    baFootnote: 'Only sets with more than 1 joint sale are shown.',\n",
              "    baEmptySearch: 'No product pairings found matching your search.',\n"
              "    baEmptyNoPairs:\n"
              "      'Not enough multi-item sales yet to detect significant product pairings.',\n")

if 'hhDaySunday' not in s:
    add_after("    hhBusiestDay: 'Busiest Day of Week',\n",
              "    /*\n"
              "     * Day names are a hardcoded English array in the heatmap (`DAYS`), not date-fns\n"
              "     * output, so they are keys here. Seven keys rather than a `{day}` interpolation:\n"
              "     * the chart's X axis takes `.substring(0, 3)` of each, which is a three-letter\n"
              "     * abbreviation in English and cuts a Japanese or Arabic name mid-word — so each\n"
              "     * language needs the short form spelled out too.\n"
              "     */\n"
              "    hhDaySunday: 'Sunday',\n"
              "    hhDayMonday: 'Monday',\n"
              "    hhDayTuesday: 'Tuesday',\n"
              "    hhDayWednesday: 'Wednesday',\n"
              "    hhDayThursday: 'Thursday',\n"
              "    hhDayFriday: 'Friday',\n"
              "    hhDaySaturday: 'Saturday',\n"
              "    hhDayShortSunday: 'Sun',\n"
              "    hhDayShortMonday: 'Mon',\n"
              "    hhDayShortTuesday: 'Tue',\n"
              "    hhDayShortWednesday: 'Wed',\n"
              "    hhDayShortThursday: 'Thu',\n"
              "    hhDayShortFriday: 'Fri',\n"
              "    hhDayShortSaturday: 'Sat',\n"
              "    hhSalesCount: '{count} Sales',\n"
              "    hhPeakLine: '{label} — {count} sales',\n")

io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('keys added')
