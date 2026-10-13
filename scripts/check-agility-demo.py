"""Narrative demo acceptance in isolated pilot databases; requires running Vite and Playwright."""
import json
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser=p.chromium.launch()
    page=browser.new_page(viewport={'width':1440,'height':1000})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(os.environ.get('ATLAS_TEST_URL','http://127.0.0.1:5173')+'?sandbox=pilot')
    page.get_by_role('button',name='Try synthetic workspace',exact=True).click()
    page.wait_for_function("document.querySelector('[data-collection-size=\"8\"]')")
    assert page.get_by_role('button',name='Open previous synthetic controls',exact=True).count()==1
    page.wait_for_function("!document.querySelector('.observation-map-stage.arranging') && !document.querySelector('.map-scene-toolbar').textContent.includes('updating')")
    assert page.locator('.map-island.similarity').count()==4
    assert page.locator('.map-island.insufficient').count()==1
    def focus(name):
        if page.locator('.window-navigation').get_attribute('open') is None:page.locator('.window-navigation summary').click()
        page.get_by_role('button',name=re.compile('^Focus '+re.escape(name)+' · ')).click()
        page.get_by_role('heading',name=name,exact=True).wait_for()
    def compare_window(name):
        row=page.locator('.suggestion').filter(has_text=name)
        if row.get_attribute('open') is not None:row.locator('summary').click()
        row.locator('summary').click()
        return row
    focus('A · Shared stagger')
    shared=page.locator('.suggestion').filter(has_text='B · Shared stagger')
    shared.wait_for()
    assert page.locator('.suggestion[open]').count()==0
    assert not shared.locator('.related-preview').is_visible()
    shared.locator('summary').click()
    shared.locator('.related-preview-scope').wait_for()
    assert shared.locator('[data-preview-quantity]').count()==3
    assert shared.locator('.related-preview-scope').get_attribute('data-match-start-fraction')=='0'
    assert shared.locator('.related-preview-scope').get_attribute('data-match-end-fraction')=='1'
    shared.screenshot(path='artifacts/related-preview-whole.png')
    page.get_by_role('button',name='Fit map',exact=True).click();page.wait_for_timeout(450)
    ids=page.locator('[data-window-id]').evaluate_all('els=>els.map(e=>e.dataset.windowId).sort()')
    page.get_by_role('button',name='Emitter',exact=True).click();page.wait_for_timeout(1100)
    assert page.locator('.map-island.emitter').count()==3
    page.get_by_role('button',name='Fit map',exact=True).click();page.wait_for_timeout(450)
    assert page.locator('[data-window-id]').evaluate_all('els=>els.map(e=>e.dataset.windowId).sort()')==ids
    focus('B · Stagger to hops')
    for name,start in [('A · Shared stagger',0),('B · Jittered hops',64)]:
        row=page.locator('.suggestion').filter(has_text=name)
        row.locator('.suggestion-coverage').wait_for()
        assert '50% covered' in row.locator('summary').inner_text()
        compare_window(name)
        assert row.locator('.related-preview').get_attribute('data-reference-axis')=='selected'
        assert float(row.locator('[data-coverage-side=selected]').get_attribute('data-coverage-fraction'))==.5
        assert float(row.locator('[data-coverage-side=related]').get_attribute('data-coverage-fraction'))==1
        page.wait_for_function("start=>document.querySelector('[data-comparison-query-start]')?.dataset.comparisonQueryStart===String(start)",arg=start)
        assert page.locator('[data-comparison-query-end]').get_attribute('data-comparison-query-end')==str(start+64)
        assert page.locator('.match-explanation').inner_text().startswith('Agreement')
        row.screenshot(path=f'artifacts/inverse-preview-{start}.png')
    page.get_by_role('button',name='Similarity',exact=True).click();page.wait_for_timeout(1100)
    assert page.locator('[data-edge-kind=partial]').count()>=2
    assert '50% covered' in page.locator('[data-edge-kind=partial] > title').first.text_content()
    assert page.locator('.map-island.similarity').count()==4
    # A shared observation can review its resemblance to B without reassigning either profile.
    focus('B · Shared stagger')
    compare_window('A · Shared stagger')
    page.locator('.match-explanation').wait_for()
    page.wait_for_function("document.querySelector('[data-comparison-window-id]')?.dataset.comparisonWindowId")
    page.get_by_label('Review explanation',exact=True).fill('Synthetic shared behaviour; retain separate emitters.')
    page.get_by_role('button',name='Accept scoped support',exact=True).click()
    page.wait_for_function("!document.querySelector('.agility-banner[role=status]')")
    snapshot=page.evaluate("""async()=>{const {AgilityStore}=await import('/src/agilityStorage.ts');const s=await AgilityStore.open('signal-atlas-agility-pilot-test-demo-v1'),v=await s.load();s.close();return v}""")
    assert len(snapshot['relationships'])==1
    assert len(snapshot['streams'])==3
    focus('A · Shared stagger')
    transition=page.locator('.suggestion').filter(has_text='B · Stagger to hops')
    compare_window('B · Stagger to hops');page.locator('.match-explanation').wait_for()
    assert transition.locator('.related-preview-scope').get_attribute('data-match-start-fraction')=='0'
    assert transition.locator('.related-preview-scope').get_attribute('data-match-end-fraction')=='0.5'
    transition.screenshot(path='artifacts/related-preview-transition.png')
    assert 'Target events [0,64)' in page.locator('.match-explanation').inner_text()
    with page.expect_download() as downloaded:page.get_by_role('button',name='Backup library',exact=True).click()
    backup=Path('artifacts/agility-demo-backup.json');downloaded.value.save_as(backup)
    page.get_by_label('Restore backup file',exact=True).set_input_files(str(backup))
    page.get_by_label('Restore preview',exact=True).wait_for()
    assert '8 sources' in page.get_by_label('Restore preview',exact=True).inner_text()
    page.get_by_label('Restore action',exact=True).select_option('replace')
    page.get_by_role('button',name='Apply validated restore',exact=True).click()
    page.wait_for_function("!document.querySelector('.restore-preview')")
    page.get_by_role('button',name='Open previous synthetic controls',exact=True).click()
    page.wait_for_function("document.querySelector('[data-collection-size=\"15\"]')")
    old=page.evaluate("""async()=>{const {AgilityStore}=await import('/src/agilityStorage.ts');const s=await AgilityStore.open('signal-atlas-agility-pilot-test-demo'),v=await s.load();s.close();return JSON.stringify(v)}""")
    page.get_by_role('button',name='Open narrative demo',exact=True).click()
    page.wait_for_function("document.querySelector('[data-collection-size=\"8\"]')")
    after=page.evaluate("""async()=>{const {AgilityStore}=await import('/src/agilityStorage.ts');const s=await AgilityStore.open('signal-atlas-agility-pilot-test-demo-v1'),v=await s.load();const originals=await Promise.all(v.sources.map(x=>s.recording(x.id)));s.close();const old=await AgilityStore.open('signal-atlas-agility-pilot-test-demo'),ov=await old.load();old.close();return {state:v,originals,old:JSON.stringify(ov)}}""")
    assert after['old']==old
    assert after['state']['relationships']==snapshot['relationships']
    for r in after['originals']:
        disk=json.loads(Path('datasets/agility-demo-v1/recordings/'+r['recording']['id']+'.json').read_text())
        assert r['recording']==disk
    page.get_by_role('button',name='Open previous synthetic controls',exact=True).click()
    page.wait_for_function("document.querySelector('[data-collection-size=\"15\"]')")
    page.get_by_role('button',name='Exit synthetic workspace',exact=True).click()
    page.get_by_role('button',name='Try synthetic workspace',exact=True).click()
    page.wait_for_function("document.querySelector('[data-collection-size=\"8\"]')")
    page.get_by_role('button',name='Open previous synthetic controls',exact=True).click()
    page.wait_for_function("document.querySelector('[data-collection-size=\"15\"]')")
    page.get_by_role('button',name='Exit synthetic workspace',exact=True).click()
    page.get_by_role('button',name='Explore the synthetic workflow',exact=True).click()
    page.wait_for_function("document.querySelector('[data-collection-size=\"8\"]')")
    page.get_by_role('button',name='Close observation inspector',exact=True).click() if page.get_by_role('button',name='Close observation inspector',exact=True).count() else None
    page.get_by_role('button',name='Similarity',exact=True).click();page.wait_for_timeout(1100)
    page.get_by_role('button',name='Fit map',exact=True).click();page.wait_for_timeout(450)
    Path('artifacts').mkdir(exist_ok=True)
    page.screenshot(path='artifacts/agility-demo-desktop.png',full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
    page.locator('.map-controls-dock summary').click()
    page.get_by_role('button',name='Fit map',exact=True).click();page.wait_for_timeout(450)
    assert page.locator('[data-window-id]').count()==8
    page.screenshot(path='artifacts/agility-demo-mobile.png',full_page=True)
    focus('A · Shared stagger')
    mobile_preview=page.locator('.suggestion').filter(has_text='B · Stagger to hops')
    compare_window('B · Stagger to hops');page.locator('.match-explanation').wait_for()
    assert 'Target events [0,64)' in page.locator('.match-explanation').inner_text()
    mobile_preview.screenshot(path='artifacts/related-preview-mobile.png')
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
    assert not errors,errors
    print(json.dumps({'windows':8,'default_similarity_groups':4,'incomplete_groups':1,'same_ids_both_arrangements':True,'cross_emitter_review':'passed','partial_interval':[0,64],'backup_restore_originals':'passed','old_demo_preserved':True,'mobile_overflow':False,'runtime_errors':errors}))
    browser.close()
