"""Observation map acceptance. Test-only database; requires Python Playwright.
ATLAS_TEST_URL and CHROMIUM_PATH select the running app/browser.
"""
import json
import os
import re
import math
from pathlib import Path
from playwright.sync_api import sync_playwright

def navigation(page):
    assert page.get_by_label('Observation map', exact=True).count() == 1
    assert page.get_by_role('button', name='Similarity', exact=True).count() == 1
    assert page.get_by_role('button', name='Emitter', exact=True).count() == 1
    assert page.get_by_role('button', name='Cycle explorer', exact=True).count() == 0
    assert page.get_by_role('button', name='Next', exact=True).count() == 0
    assert page.get_by_role('button', name='Previous', exact=True).count() == 0

if __name__ == '__main__':
    with sync_playwright() as p:
        browser = p.chromium.launch(**({'executable_path':os.environ['CHROMIUM_PATH']} if os.environ.get('CHROMIUM_PATH') else {}))
        page = browser.new_page(viewport={'width':1440,'height':1000})
        page.set_default_timeout(30000)
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(os.environ.get('ATLAS_TEST_URL','http://127.0.0.1:5173')+'?sandbox=pilot')
        page.get_by_role('button',name='Try synthetic workspace',exact=True).click()
        page.wait_for_function("document.querySelector('[data-collection-size=\"15\"]')")
        navigation(page)
        def settled():
            page.wait_for_function("document.querySelector('.observation-map-shell [role=status]') && !document.querySelector('.observation-map-stage.arranging') && !document.querySelector('.observation-map-shell [role=status]').textContent.includes('updating')")
            # React starts the 950 ms transition in an effect after the control event.
            page.wait_for_timeout(1100)
            page.wait_for_function("!document.querySelector('.observation-map-stage.arranging')")
        def positions():
            return page.locator('[data-window-id]').evaluate_all('(els)=>Object.fromEntries(els.map(e=>[e.dataset.windowId,e.dataset.position]))')
        def focus(name):
            if page.locator('.window-navigation').get_attribute('open') is None:page.locator('.window-navigation summary').click()
            page.get_by_role('button',name=re.compile('^Focus '+re.escape(name)+r' . (Unreviewed|Reviewed|Unresolved)$')).click()
            page.get_by_role('heading',name=name,exact=True).wait_for()
        def mask(quantities):
            # Add first: the last selected parameter must never be deselected.
            for q in ['Frequency','PRI','PW']:
                if q in quantities and not page.get_by_label('Compare '+q,exact=True).is_checked():
                    page.get_by_label('Compare '+q,exact=True).click()
                    page.wait_for_function("q=>document.querySelector('[aria-label=\"Compare '+q+'\"]').checked",arg=q)
            for q in ['Frequency','PRI','PW']:
                if q not in quantities and page.get_by_label('Compare '+q,exact=True).is_checked():
                    page.get_by_label('Compare '+q,exact=True).click()
                    page.wait_for_function("q=>!document.querySelector('[aria-label=\"Compare '+q+'\"]').checked",arg=q)
            settled()
            text=page.get_by_label('Map legend',exact=True).inner_text()
            assert ' + '.join(quantities) in text,text
        settled()
        assert page.get_by_label('Map legend',exact=True).is_visible()
        masks=[['Frequency'],['PRI'],['PW'],['Frequency','PRI'],['Frequency','PW'],['PRI','PW'],['Frequency','PRI','PW']]
        for quantities in masks:mask(quantities)
        mask(['Frequency']);assert not page.get_by_label('Compare Frequency',exact=True).is_enabled()
        mask(['Frequency','PRI','PW'])
        focus('Control observation 5')
        page.wait_for_function("document.querySelector('[data-edge-kind=partial]')")
        assert 'Partial' in page.locator('[data-edge-kind=partial] .map-edge-label').first.text_content()
        page.get_by_role('button',name='Fit map',exact=True).click();page.wait_for_timeout(450)
        # Layout movement occurs in similarity, remains fixed in emitter arrangement.
        page.get_by_role('button',name='Emitter',exact=True).click();settled();page.get_by_role('button',name='Fit map',exact=True).click();page.wait_for_timeout(450)
        emitter=positions()
        for quantities in masks:
            mask(quantities);assert positions()==emitter
        page.get_by_label('Search map',exact=True).fill('Control observation 5')
        assert positions()==emitter
        page.get_by_label('Hide nonmatches',exact=True).check();assert page.locator('[data-window-id]').count()==1
        page.get_by_label('Hide nonmatches',exact=True).uncheck();assert positions()==emitter
        page.get_by_label('Search map',exact=True).fill('')
        page.get_by_role('button',name='Similarity',exact=True).click();settled()
        before=positions();page.get_by_label('Compare PW',exact=True).click()
        page.wait_for_function("document.querySelector('.observation-map-stage.arranging')")
        # Switch arrangement during the in-flight movement; survivors start from current positions.
        at=positions();page.get_by_role('button',name='Emitter',exact=True).click()
        instant=positions()
        for id in at.keys()&instant.keys():
            a=[float(v) for v in at[id].split(',')];b=[float(v) for v in instant[id].split(',')]
            assert math.dist(a,b)<120,(a,b)
        settled();mask(['Frequency','PRI','PW'])
        # Camera keyboard, wheel anchor, panning and semantic zoom.
        svg=page.get_by_label('Observation map',exact=True);svg.scroll_into_view_if_needed()
        svg.press('0');page.wait_for_timeout(450)
        camera=lambda:json.loads(svg.get_attribute('data-camera'))
        c=camera();box=svg.bounding_box();anchor={'x':math.floor(box['x']+box['width']*.42)-box['x'],'y':math.floor(box['y']+box['height']*.43)-box['y']}
        world=lambda c:((anchor['x']-c['x'])/c['zoom'],(anchor['y']-c['y'])/c['zoom'])
        page.mouse.move(box['x']+anchor['x'],box['y']+anchor['y']);page.mouse.wheel(0,-350);page.wait_for_timeout(100)
        assert math.dist(world(c),world(camera()))<.01,(c,camera(),box,anchor,world(c),world(camera()))
        c=camera();page.mouse.move(box['x']+20,box['y']+20);page.mouse.down();page.mouse.move(box['x']+70,box['y']+60,steps=5);page.mouse.up()
        assert abs(camera()['x']-c['x']-50)<1
        svg.press('ArrowRight');assert abs(camera()['x']-c['x']+20)<1
        for _ in range(12):page.get_by_role('button',name='Zoom out',exact=True).click()
        assert svg.get_attribute('data-detail')=='overview'
        for _ in range(8):page.get_by_role('button',name='Zoom in',exact=True).click()
        assert svg.get_attribute('data-detail')=='preview'
        for _ in range(5):page.get_by_role('button',name='Zoom in',exact=True).click()
        assert svg.get_attribute('data-detail')=='detail'
        # Synthetic pointer pinch preserves the world position under its moving midpoint.
        pinch=page.evaluate("""()=>{const e=document.querySelector('.observation-map'),r=e.getBoundingClientRect(),c=JSON.parse(e.dataset.camera);const fire=(type,id,x,y)=>e.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',isPrimary:id===101,clientX:r.x+x,clientY:r.y+y,button:0,bubbles:true}));
          // Browser capture requires active pointers. Use actual CDP touch input below instead.
          return {x:r.x,y:r.y,width:r.width,height:r.height,c};}""")
        session=page.context.new_cdp_session(page)
        a={'x':pinch['x']+180,'y':pinch['y']+200};b={'x':pinch['x']+280,'y':pinch['y']+200}
        session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[dict(a,id=1),dict(b,id=2)]})
        session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[dict(a,x=a['x']-30,id=1),dict(b,x=b['x']+30,id=2)]})
        session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        page.wait_for_timeout(100);after=camera();assert after['zoom']>pinch['c']['zoom']
        # Reduce motion: layout settles without an animation class.
        page.emulate_media(reduced_motion='reduce');page.get_by_role('button',name='Similarity',exact=True).click();settled();assert not page.locator('.observation-map-stage').get_attribute('class').endswith('arranging')
        # Focusing a moving layout must keep the selected destination in view.
        page.emulate_media(reduced_motion='no-preference');settled()
        page.get_by_role('button',name='Emitter',exact=True).click()
        page.wait_for_function("document.querySelector('.observation-map-stage.arranging')")
        page.get_by_role('button',name='Focus selected',exact=True).click();settled()
        assert page.locator('[data-window-id][aria-pressed=true]').count()==1
        point=page.locator('[data-window-id][aria-pressed=true]').bounding_box();viewport=svg.bounding_box()
        assert viewport['x']<=point['x']+point['width']/2<=viewport['x']+viewport['width']
        page.get_by_role('button',name='Similarity',exact=True).click();settled()
        assert page.locator('[data-window-id][aria-pressed=true]').count()==1
        # A display-filter result can be focused without an analytical selection.
        page.get_by_role('button',name='Close observation inspector',exact=True).click()
        page.get_by_label('Search map',exact=True).fill('Control observation 10')
        assert page.get_by_role('button',name='Focus matches',exact=True).is_enabled()
        page.get_by_role('button',name='Focus matches',exact=True).click();page.wait_for_timeout(450)
        assert page.get_by_role('button',name='Inspect Control observation 10',exact=True).is_visible()
        page.get_by_label('Search map',exact=True).fill('no such observation')
        assert not page.get_by_role('button',name='Focus matches',exact=True).is_enabled()
        page.get_by_label('Search map',exact=True).fill('');focus('Control observation 3')
        # Old target traces clear immediately; late completion cannot overwrite B.
        page.locator('.suggestion').filter(has_text='Coordinated sequence').click();page.locator('.comparison-trace').first.wait_for()
        targets={name:page.locator('.suggestion').filter(has_text=name).get_attribute('data-target-window-id') for name in ['Coordinated sequence','Control observation 2','Control observation 11']}
        page.evaluate("""targets=>{const W=Worker;window.comparisonWorkerOriginal=W;window.Worker=class extends W{postMessage(d,o){if(d.kind==='view'){const f=this.onmessage;this.onmessage=e=>setTimeout(()=>f.call(this,e),d.windowId===targets['Control observation 2']?900:200)}super.postMessage(d,o)}}}""",targets)
        page.locator('.suggestion').filter(has_text='Control observation 2').click()
        assert page.locator('.comparison-trace').count()==0
        page.locator('.suggestion').filter(has_text='Control observation 11').click()
        page.wait_for_function("id=>document.querySelector('[data-comparison-window-id]')?.dataset.comparisonWindowId===id",arg=targets['Control observation 11'])
        page.wait_for_timeout(1000)
        assert page.locator('[data-comparison-window-id]').get_attribute('data-comparison-window-id')==targets['Control observation 11']
        page.evaluate('()=>{window.Worker=window.comparisonWorkerOriginal}')
        # Reach an unreviewed destination, explicitly create its pattern, then return.
        focus('Control observation 3');page.locator('.suggestion').filter(has_text='Control observation 2').click()
        page.get_by_role('button',name='Inspect target / create reviewed pattern',exact=True).click()
        page.get_by_label('Review explanation',exact=True).fill('Reviewed destination B')
        page.get_by_role('button',name='Create new pattern',exact=True).click();settled()
        focus('Control observation 3');page.locator('.suggestion').filter(has_text='Reviewed destination B').click()
        page.wait_for_function("Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Accept scoped support'&&!b.disabled)")
        assert page.get_by_role('button',name='Accept scoped support',exact=True).is_enabled()
        # Make a second reviewed interpretation supported by the same exact destination window.
        page.evaluate("""async()=>{const {AgilityStore}=await import('/src/agilityStorage.ts');const {reviewWindow}=await import('/src/agilityModel.ts');const {compareWindow}=await import('/src/agilityMatching.ts');const s=await AgilityStore.open('signal-atlas-agility-pilot-test-demo');let v=await s.load();const rev=v.revision,q=v.windows.find(w=>w.recordingId==='recording-0002'),t=v.windows.find(w=>w.recordingId==='recording-0007');v=reviewWindow(v,t.id,'new-pattern','Alternative B interpretation');const p=v.patterns.find(p=>p.representativeWindowId===t.id),m=compareWindow(v.views[q.id],v.views[t.id],v.settings);v=reviewWindow(v,q.id,'support','Scoped evidence',p.id,m.explanation,m.score);await s.commit(v,rev);s.close()}""")
        page.reload();page.get_by_role('button',name='Try synthetic workspace',exact=True).click();settled();focus('Control observation 3');page.locator('.suggestion').filter(has_text='Reviewed destination B').click()
        assert page.get_by_label('Destination pattern',exact=True).input_value()==''
        assert not page.get_by_role('button',name='Accept scoped support',exact=True).is_enabled()
        page.get_by_label('Destination pattern',exact=True).select_option(label='Reviewed destination B · revision 1')
        page.wait_for_function("Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Accept scoped support'&&!b.disabled)")
        assert page.get_by_role('button',name='Accept scoped support',exact=True).is_enabled()
        # 38 windows from one source: 37 highlights, eight suggestion edges. No representative cap.
        page.evaluate("""async()=>{const {AgilityStore}=await import('/src/agilityStorage.ts');const {emptyLibrary,addRecording,windowView,reviewWindow}=await import('/src/agilityModel.ts');const s=await AgilityStore.open('signal-atlas-agility-pilot-test-demo'),old=await s.load(),r=await s.recording('recording-0001');let v=addRecording(emptyLibrary(),r,old.streams.find(p=>p.id===r.recording.streamId));const q=v.windows[0];v=reviewWindow(v,q.id,'new-pattern','Dense source');for(let i=1;i<38;i++){const w={...q,id:'dense-'+i,reviewState:'unreviewed'};v.windows.push(w);v.views[w.id]=windowView(r.recording,w)}await s.commit(v,old.revision,[r],true);s.close()}""")
        page.reload();page.get_by_role('button',name='Try synthetic workspace',exact=True).click();settled();focus('Dense source');page.get_by_role('button',name='Fit map',exact=True).click();page.wait_for_timeout(450)
        page.wait_for_function("document.querySelectorAll('[data-highlighted=true]').length===37")
        assert page.locator('[data-edge-kind=whole]').count()==8
        assert '8 of 37' in page.locator('.map-match-count').inner_text()
        page.get_by_label('Connection limit',exact=True).select_option('10000');assert page.locator('[data-edge-kind=whole]').count()==37
        # Probe rendered label/card overlap: hit-testing must return the topmost connection.
        overlap=page.evaluate("""()=>{const tiles=[...document.querySelectorAll('.observation-card')].map(e=>e.getBoundingClientRect());for(const e of document.querySelectorAll('.map-edge-label rect')){const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;if(tiles.some(t=>x>t.x&&x<t.right&&y>t.y&&y<t.bottom)){const hit=document.elementFromPoint(x,y);if(hit?.closest('.map-edge-label'))return {x,y,kind:hit.closest('[data-edge-kind]').dataset.edgeKind}}}return null}""")
        assert overlap, 'No visible above-card connector label found'
        page.mouse.click(overlap['x'],overlap['y']);page.locator('.match-explanation').wait_for()
        # Label and tile keyboard activation, and visible offscreen navigation.
        page.locator('.map-edge-label').first.press('Enter');page.locator('.match-explanation').wait_for()
        page.locator('[data-window-id]').first.press('Enter');assert page.get_by_label('Observation inspector',exact=True).is_visible()
        page.get_by_role('button',name='Focus selected',exact=True).click();page.wait_for_timeout(450)
        page.get_by_role('button',name='Fit map',exact=True).click();page.wait_for_timeout(450)
        dense=positions();page.get_by_label('Search map',exact=True).fill('dense-37');assert positions()==dense
        assert page.locator('[data-dimmed=true]').count()==37
        page.get_by_label('Hide nonmatches',exact=True).check();assert page.locator('[data-window-id]').count()==1
        page.get_by_label('Hide nonmatches',exact=True).uncheck();assert positions()==dense
        page.get_by_label('Search map',exact=True).fill('')
        page.set_viewport_size({'width':390,'height':844});page.get_by_role('button',name='Close observation inspector',exact=True).click()
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
        Path('artifacts').mkdir(exist_ok=True)
        page.screenshot(path='artifacts/agility-map-mobile.png',full_page=True)
        page.set_viewport_size({'width':1440,'height':1000});page.get_by_role('button',name='Fit map',exact=True).click();page.wait_for_timeout(450)
        page.screenshot(path='artifacts/agility-map-desktop.png',full_page=True)
        # A slow grouping job in a new workspace must never reuse the previous
        # workspace's scene or omit the new default observation.
        page.evaluate("""async()=>{const {AgilityStore}=await import('/src/agilityStorage.ts'),{emptyLibrary,addRecording}=await import('/src/agilityModel.ts');const demo=await AgilityStore.open('signal-atlas-agility-pilot-test-demo'),v=await demo.load(),r=await demo.recording('recording-0001');demo.close();const s=await AgilityStore.open('signal-atlas-agility-pilot-test'),old=await s.load();await s.commit(addRecording(emptyLibrary(),r,v.streams.find(p=>p.id===r.recording.streamId)),old.revision,[r],true);s.close();const W=Worker;window.Worker=class extends W{postMessage(d,o){if(d.kind==='groups')setTimeout(()=>super.postMessage(d,o),1500);else super.postMessage(d,o)}}}""")
        page.get_by_role('button',name='Exit synthetic workspace',exact=True).click()
        page.wait_for_function("document.querySelector('[data-collection-size=\"1\"]')")
        assert page.locator('[data-window-id]').count()==1
        assert not page.get_by_role('button',name='Focus matches',exact=True).is_enabled()
        page.get_by_role('button',name='Try synthetic workspace',exact=True).click();settled()
        assert page.locator('.observation-map').get_attribute('data-collection-size')=='38'
        report={'navigation':'passed','masks':7,'dense_windows':38,'highlights':37,'default_edges':8,'partial_edges':'passed','emitter_stability':'passed','dim_hide_no_repack':'passed','wheel_pan_keyboard':'passed','pinch':'CDP emulated','transition_interruption':'passed','reduced_motion':'passed','explicit_review_targets':'passed','comparison_out_of_order':'passed','transition_focus':'passed','display_filter_focus':'passed','workspace_staleness':'passed','zero_match_focus_disabled':'passed','above_card_label_hit':overlap,'mobile_overflow':False,'runtime_errors':errors}
        assert not errors,errors
        Path('artifacts/agility-map-acceptance.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
        browser.close()

