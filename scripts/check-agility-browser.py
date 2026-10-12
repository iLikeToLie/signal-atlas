"""Acceptance on a running Vite dev server. Requires Python Playwright + Chromium.
Run: python scripts/check-agility-browser.py [--pilot]
"""
import argparse
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--pilot', action='store_true')
args = parser.parse_args()
base = os.environ.get('ATLAS_TEST_URL', 'http://127.0.0.1:5173')
out = Path('artifacts'); out.mkdir(exist_ok=True)
state_js = """async () => { const {AgilityStore}=await import('/src/agilityStorage.ts');const s=await AgilityStore.open('signal-atlas-agility-pilot-test-demo'); const value=await s.load();s.close();return value;}"""
base_state_js=state_js.replace('pilot-test-demo','pilot-test')
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, timezone_id='Asia/Singapore', accept_downloads=True)
    page = context.new_page(); page.set_default_timeout(30000)
    errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(base+'?sandbox=pilot')
    # Exercise actual modal -> preview -> worker import -> transactional storage.
    original=Path('datasets/agility-stage0-v1/recordings/recording-0001.json')
    page.get_by_role('button',name='+ Add observation',exact=True).click()
    page.get_by_label('Event data file',exact=True).set_input_files(original)
    page.get_by_role('button',name='Preview before saving',exact=True).click()
    page.get_by_label('Event import preview',exact=True).wait_for()
    assert len(page.evaluate(base_state_js)['sources'])==0
    assert page.get_by_label('Event data',exact=True).get_attribute('readonly') is not None
    page.get_by_role('button',name='Cancel',exact=True).click()
    assert len(page.evaluate(base_state_js)['sources'])==0
    page.get_by_role('button',name='+ Add observation',exact=True).click()
    page.get_by_label('Event data file',exact=True).set_input_files(original)
    page.get_by_label('Profile name',exact=True).fill('Imported emitter A')
    page.get_by_label('Profile identity',exact=True).select_option('emitter')
    page.get_by_role('button',name='Preview before saving',exact=True).click()
    page.get_by_role('button',name='Save original & full window',exact=True).click()
    page.locator('dialog').wait_for(state='detached')
    saved=page.evaluate(base_state_js);assert len(saved['sources'])==1 and len(saved['windows'])==1
    assert page.evaluate("""async()=>{const {AgilityStore}=await import('/src/agilityStorage.ts');const s=await AgilityStore.open('signal-atlas-agility-pilot-test');const r=await s.recording('recording-0001');s.close();return r.originalText;}""")==original.read_text()
    page.get_by_label('Review explanation',exact=True).fill('Imported coordinated pattern')
    page.get_by_role('button',name='Create new pattern',exact=True).click()
    page.wait_for_function("!Array.from(document.querySelectorAll('.agility-banner')).some(e=>e.textContent.includes('Saving or validating'))")
    page.get_by_role('button',name='+ Add observation',exact=True).click()
    page.get_by_label('Event data file',exact=True).set_input_files('datasets/agility-stage0-v1/recordings/recording-0002.csv')
    page.get_by_role('button',name='Preview before saving',exact=True).click()
    page.get_by_role('button',name='Save original & full window',exact=True).click()
    page.locator('dialog').wait_for(state='detached');page.locator('.suggestion').first.wait_for()
    assert '100.0%' in page.locator('.suggestion').first.inner_text()
    assert len(page.evaluate(base_state_js)['sources'])==2
    page.get_by_role('button', name='Try synthetic workspace', exact=True).click()
    page.locator('.suggestion').first.wait_for()
    page.wait_for_function("!document.querySelector('.agility-banner.error')")
    assert '100.0%' in page.locator('.suggestion').first.inner_text()
    page.locator('.suggestion').first.click()
    page.locator('.agility-inspector .comparison-trace').first.wait_for()
    page.get_by_role('button', name='Normalized view', exact=True).click()
    axis=page.locator('.agility-inspector .agility-chart').first.evaluate("""chart=>({own:chart.querySelector('.trace').getAttribute('d'),target:chart.querySelector('.comparison-trace').getAttribute('d')})""")
    query=json.loads(Path('datasets/agility-stage0-v1/recordings/recording-0003.json').read_text())
    target=json.loads(original.read_text())
    values=[e['values']['frequency'] for r in [query,target] for e in r['events']]
    low,high=min(values),max(values)
    # In original mode, both actual first values must use the same physical y axis.
    import re
    for name,record in [('own',query),('target',target)]:
        y=float(re.match(r'M[^,]+,([-0-9.]+)',axis[name]).group(1))
        expected=88-(record['events'][0]['values']['frequency']-low)/(high-low)*82
        assert abs(y-expected)<0.02,(name,y,expected)
    page.get_by_role('button',name='Original values',exact=True).click()
    page.get_by_label('Review explanation', exact=True).fill('Observed twice-duration scale variant.')
    page.get_by_role('button', name='Accept as variant', exact=True).click()
    page.wait_for_function("!Array.from(document.querySelectorAll('.agility-banner')).some(e=>e.textContent.includes('Saving or validating'))")
    assert len(page.evaluate(state_js)['variants']) == 1

    page.get_by_role('button', name='Inspect Control observation 2', exact=True).click()
    page.locator('.suggestion').first.wait_for(); page.locator('.suggestion').first.click()
    page.get_by_role('button', name='Accept scoped support', exact=True).click()
    page.wait_for_function("!Array.from(document.querySelectorAll('.agility-banner')).some(e=>e.textContent.includes('Saving or validating'))")
    linked = page.evaluate(state_js)
    assert len(linked['relationships']) == 1
    assert len({p['streamId'] for p in linked['patterns']}) == 2
    page.get_by_label('Show links', exact=True).check()
    assert page.locator('.reviewed-link').count() == 1
    page.get_by_role('button', name='coordinated-similarity', exact=True).press('Enter')
    page.locator('.match-explanation').wait_for()
    assert page.locator('.agility-inspector .comparison-trace').count() == 3
    assert '[0,64)' in page.locator('.match-explanation').inner_text()

    page.get_by_role('button', name='Inspect Control observation 5', exact=True).click()
    page.locator('.suggestion').first.wait_for(); page.locator('.suggestion').first.click()
    assert '[16,48)' in page.locator('.match-explanation').inner_text()
    page.get_by_role('button', name='Inspect Control observation 6', exact=True).click()
    page.locator('.suggestion').first.wait_for(); page.locator('.suggestion').first.click()
    assert 'unresolved' in page.locator('.match-explanation').inner_text()
    assert 'partial channels' in page.locator('.suggestion').first.inner_text()
    page.get_by_role('button', name='Inspect Control observation 10', exact=True).click()
    page.get_by_role('button', name='Leave unresolved', exact=True).click()
    page.wait_for_function("!Array.from(document.querySelectorAll('.agility-banner')).some(e=>e.textContent.includes('Saving or validating'))")
    retained = page.evaluate(state_js); assert any(w['reviewState'] == 'unresolved' for w in retained['windows'])

    page.get_by_role('button', name='Emitters', exact=True).click(); assert page.locator('.emitter-card').count() == 3
    page.get_by_role('button', name='Patterns', exact=True).click()
    page.get_by_role('button', name='Inspect Coordinated sequence', exact=True).click()
    page.get_by_text('Source windows and sequence timing', exact=True).click()
    page.get_by_label('Window start event', exact=True).fill('16'); page.get_by_label('Window end event', exact=True).fill('48')
    page.get_by_role('button', name='Add selected window', exact=True).click()
    page.wait_for_function("!Array.from(document.querySelectorAll('.agility-banner')).some(e=>e.textContent.includes('Saving or validating'))")
    with_window = page.evaluate(state_js); assert len(with_window['windows']) == 16
    page.get_by_role('button', name='Undo last review', exact=True).click()
    page.wait_for_function("!Array.from(document.querySelectorAll('.agility-banner')).some(e=>e.textContent.includes('Saving or validating'))")
    after_undo = page.evaluate(state_js); assert len(after_undo['windows']) == 16
    assert len(after_undo['relationships']) == 1

    with page.expect_download() as downloaded:
        page.get_by_role('button', name='Backup library', exact=True).click()
    backup = out / 'agility-browser-backup.json'; downloaded.value.save_as(backup)
    before_restore = page.evaluate(state_js)
    page.get_by_label('Restore backup file', exact=True).set_input_files(backup)
    page.get_by_label('Restore preview', exact=True).wait_for()
    page.get_by_label('Restore action', exact=True).select_option('replace')
    page.get_by_role('button', name='Apply validated restore', exact=True).click()
    page.get_by_label('Restore preview', exact=True).wait_for(state='detached')
    after_restore = page.evaluate(state_js)
    for key in ['sources','windows','patterns','variants','evidence','relationships','decisions','history','historyArchive','views','settings']:
        assert after_restore[key] == before_restore[key], key
    broken = json.loads(backup.read_text()); broken['sha256'] = '0' * 64
    bad = out / 'agility-corrupt-backup.json'; bad.write_text(json.dumps(broken))
    page.get_by_label('Restore backup file', exact=True).set_input_files(bad)
    page.get_by_role('alert').filter(has_text='integrity').wait_for()
    assert page.evaluate(state_js)['revision'] == after_restore['revision']
    page.reload(); page.get_by_role('button', name='Try synthetic workspace', exact=True).click(); page.locator('.pattern-card').first.wait_for()
    reloaded = page.evaluate(state_js); assert reloaded['relationships'] == after_restore['relationships']

    rollback = page.evaluate("""async () => {
      const {AgilityStore,AGILITY_DB}=await import('/src/agilityStorage.ts');
      const {addRecording}=await import('/src/agilityModel.ts');
      const s=await AgilityStore.open('signal-atlas-agility-pilot-test-demo'), before=await s.load(), first=await s.recording(before.sources[0].id);
      const extra={...first,id:'failure-recording',recording:{...first.recording,id:'failure-recording'}};
      const next=addRecording(before,extra,before.streams.find(p=>p.id===first.recording.streamId));
      const original=IDBObjectStore.prototype.put; let rejected=false;
      IDBObjectStore.prototype.put=function(...a){if(this.name==='library')throw new DOMException('Simulated quota failure','QuotaExceededError');return original.apply(this,a)};
      try{await s.commit(next,before.revision,[extra])}catch{rejected=true}finally{IDBObjectStore.prototype.put=original}
      const after=await s.load();let absent=false;try{await s.recording('failure-recording')}catch{absent=true}
      let stale=false;try{await s.commit(before,before.revision-1)}catch{stale=true}
      s.close();return {rejected,unchanged:JSON.stringify(before)===JSON.stringify(after),absent,stale};
    }""")
    assert all(rollback.values()), rollback
    page.get_by_role('button', name='Inspect Coordinated sequence', exact=True).click()
    page.screenshot(path=str(out/'agility-desktop.png'), full_page=True)
    page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(out/'agility-mobile.png'),full_page=True)
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
    assert not errors, errors
    report={'browser':browser.version,'acceptance':'passed','rollback':rollback,'mobile_overflow':False,'runtime_errors':errors}
    if args.pilot:
        report['pilot']='Run scripts/check-agility-pilot.py after generating the workload.'
    (out/'agility-acceptance.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report))
    context.close();browser.close()
