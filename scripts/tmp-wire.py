import io, sys

p = sys.argv[1]
s = io.open(p, encoding='utf-8', newline='').read()
NL = '\r\n' if '\r\n' in s else '\n'
print('line endings:', 'CRLF' if NL == '\r\n' else 'LF')

def sub(old, new, n=1):
    """Replace, matching the file's own line endings so a CRLF file is not missed."""
    global s
    o = old.replace('\n', NL)
    w = new.replace('\n', NL)
    c = s.count(o)
    assert c == n, 'expected %d got %d for: %r' % (n, c, old[:90])
    s = s.replace(o, w)

sub("import { trackFeature } from '@/lib/product-telemetry';",
    "import { trackFeature } from '@/lib/product-telemetry';\n"
    "import { useI18n } from '@/context/i18n-context';")

sub("""                            title: 'Loading Data...',
                            description: 'It is taking a bit longer. If you are offline, we are showing your local synchronized data.',""",
    """                            title: t('reports.loadingDataTitle'),
                            description: t('reports.loadingDataBody'),""")

sub("toast({ title: 'Generating Report...', description: 'Please wait while we capture your dashboard.' });",
    "toast({ title: t('reports.generatingTitle'), description: t('reports.generatingBody') });")

sub("toast({ variant: 'success', title: 'Report Downloaded', description: 'Your dashboard image has been saved.' });",
    "// The body, and both failure strings below, are dashboard's: same widget, same words.\n"
    "            toast({ variant: 'success', title: t('reports.downloadedTitle'), description: t('dashboard.downloadedDescription') });")

sub("toast({ variant: 'destructive', title: 'Download Failed', description: 'Could not capture the dashboard image.' });",
    "toast({ variant: 'destructive', title: t('dashboard.downloadFailed'), description: t('dashboard.downloadFailedDescription') });")

sub("toast({ variant: 'success', title: 'Analytics exported', description: 'Your CSV has been saved.' });",
    "toast({ variant: 'success', title: t('reports.exportedTitle'), description: t('reports.exportedBody') });")

sub('<PageTitle title="Reports" subtitle="Deep dive into your business performance." />',
    "<PageTitle title={t('reports.title')} subtitle={t('reports.subtitle')} />")

io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('wrote', p)
