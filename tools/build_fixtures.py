#!/usr/bin/env python3
"""Recreate original SYNTHETIC teaching assets. MIT. Requires Pillow; ffmpeg optional."""
from pathlib import Path
import csv
import hashlib
import json
import shutil
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/assets/case'
LABEL = 'SYNTHETIC / УЧЕБНЫЙ МАТЕРИАЛ — вымышленные данные, CC BY 4.0'


def write(name, text):
    p = OUT / name
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding='utf-8')


def table(name, headers, rows):
    with (OUT / name).open('w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers.split(','))
        writer.writerows([list(r) + ['true'] for r in rows])


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    table('posts.csv', 'post_id,published_at,account_id,text,source_ref,synthetic', [
        ['P01','2025-05-17T12:10:00+03:00','CITY-DIGEST','Северная переправа открыта для автомобилей 17 мая. Контракт выиграла компания Маяк. Все 12 миллионов уже выплачены. Фото снято сегодня.','media/repost.jpg'],
        ['P02','2025-05-17T12:15:00+03:00','REPOST-A','Перепечатка: переправа открыта, выплачены 12 миллионов.','P01'],
        ['P03','2025-05-17T12:18:00+03:00','REPOST-B','Сообщение CITY-DIGEST: мост открыт для автомобилей.','P01'],
        ['P04','2025-05-18T09:05:00+03:00','NOTICE','Открыт проход для пешеходов; автомобили пока не допускаются.','bulletin-02.txt'],
        ['P05','2025-05-17T13:00:00+03:00','RIVER-NOTES','Вижу людей на мосту; дату съёмки подтвердить не могу.','media/repost.jpg'],
    ])
    write('bulletin-01.txt', LABEL + '\nID: B01\npublished_at: 2025-05-17T08:00:00Z\nИсточник в модели: администрация учебного города.\n17 мая проводятся нагрузочные испытания Северной переправы.\nДопуска для движения автомобилей нет. Дата открытия будет назначена после приёмки.\n')
    write('bulletin-02.txt', LABEL + '\nID: B02\npublished_at: 2025-05-18T06:00:00Z\nИсточник в модели: администрация учебного города.\nПроход для пешеходов открыт 18 мая в 09:00 UTC+03:00.\nДвижение автомобилей остаётся закрытым.\n')
    write('archive/page-before.txt', LABEL + '\nID: A01\nurl: https://northbridge.example/status\ncaptured_at: 2025-05-16T18:00:00Z\nИспытания запланированы на 17 мая. Дата открытия не назначена.\n')
    write('archive/page-after.txt', LABEL + '\nID: A02\nurl: https://northbridge.example/status\ncaptured_at: 2025-05-18T06:10:00Z\nПроход для пешеходов открыт 18 мая. Автомобили пока не допускаются.\n')
    table('companies.csv','registry_id,name,jurisdiction,status,address_code,synthetic',[
        ['SYN-101','Маяк Инжиниринг','TRAIN-A','active','OFFICE-7'],
        ['SYN-202','Маяк Медиа','TRAIN-A','active','OFFICE-7'],
        ['SYN-303','Mayak Engineering','TRAIN-B','active','OFFICE-9'],
    ])
    write('registry-notes.txt', LABEL+'\nID: R01\nOFFICE-7 — учебное коворкинг-здание. Общий адрес не устанавливает собственника.\nЗапись реестра — утверждение источника. В этих данных нет сведений о бенефициарах.\nЮрисдикции TRAIN-A и TRAIN-B вымышлены; валюта TST не существует.\n')
    table('contracts.csv','contract_id,supplier_id,description,contract_value,currency,signed_at,synthetic',[
        ['C-17','SYN-101','Испытания и подготовка переправы',12000000,'TST','2025-04-20'],
        ['C-18','SYN-202','Информационные материалы',250000,'TST','2025-05-02'],
    ])
    payments = [
        ['PAY-01','C-17',3000000,'TST','2025-04-25','settled'],
        ['PAY-02','C-17',2000000,'TST','2025-05-10','settled'],
        ['PAY-03','C-17',7000000,'TST','2025-05-20','scheduled'],
        ['PAY-04','C-18',250000,'TST','2025-05-05','settled'],
    ]
    table('payments.csv','payment_id,contract_id,amount,currency,paid_at,status,synthetic',payments)
    dirty = [payments[0],payments[0],['PAY-02','C-17','2 000 000','TST','2025-05-10','settled'],
        ['PAY-03','C-17','7,000,000','TST','2025-05-20','scheduled'],
        ['BAD-01','C-17','unknown','TST','2025-05-11','settled'],payments[3]]
    table('payments-dirty.csv','payment_id,contract_id,amount,currency,paid_at,status,synthetic',dirty)
    write('domain-records.json', json.dumps({
        'synthetic': True,'collected_at':'2025-05-18T12:00:00Z','domain':'northbridge.example',
        'A':['192.0.2.10'],'MX':['mail.northbridge.example'],'nameservers':['ns1.example'],
        'certificate':{'SAN':['northbridge.example','www.northbridge.example'],'not_before':'2025-04-01T00:00:00Z'},
        'registrar':'Example Registrar','registrant':'redacted',
        'historical_A':{'address':'198.51.100.20','observed_at':'2025-04-01T00:00:00Z'},
        'other_domain_on_same_ip':'harbor.example','caution':'Shared hosting does not establish shared ownership.'
    },ensure_ascii=False,indent=2)+'\n')
    fields = 'payment_id contract_id amount currency paid_at status'.split()
    write('api-response.json',json.dumps({'synthetic':True,'schema_version':1,'records':[dict(zip(fields,r)) for r in payments]},ensure_ascii=False,indent=2)+'\n')
    table('timeline.csv','event_id,original_time,utc_time,kind,source_ref,synthetic',[
        ['T01','2025-05-03T10:00:00Z','2025-05-03T10:00:00Z','capture','archive/photo-record.txt'],
        ['T02','2025-05-17T08:00:00Z','2025-05-17T08:00:00Z','publication','bulletin-01.txt'],
        ['T03','2025-05-17T12:10:00+03:00','2025-05-17T09:10:00Z','publication','posts.csv#P01'],
        ['T04','2025-05-18T09:00:00+03:00','2025-05-18T06:00:00Z','event','bulletin-02.txt'],
    ])
    write('search-corpus.json',json.dumps({'synthetic':True,'note':'Local reading corpus; not a search-engine simulation.', 'documents':[
        {'id':'S01','title':'Северная переправа — испытания','text':'Испытания запланированы на 17 мая.','date':'2025-05-16','domain':'northbridge.example'},
        {'id':'S02','title':'North crossing pedestrian notice','text':'Pedestrian access begins May 18; motor traffic remains closed.','date':'2025-05-18','domain':'northbridge.example'},
        {'id':'S03','title':'Маяк Инжиниринг — C-17','text':'Контракт на 12 000 000 TST, поставщик SYN-101.','date':'2025-04-20','domain':'registry.example'},
        {'id':'S04','title':'Mayak Engineering','text':'Registry SYN-303 in TRAIN-B, no C-17 reference.','date':'2025-04-21','domain':'registry.example'},
        {'id':'S05','title':'Маяк: перепечатка','text':'Ссылаемся только на CITY-DIGEST P01.','date':'2025-05-17','domain':'digest.example'},
        {'id':'S06','title':'Северный мост другого города','text':'Другой объект: не Северная переправа.','date':'2024-05-17','domain':'elsewhere.example'},
    ]},ensure_ascii=False,indent=2)+'\n')
    make_media()
    records = []
    for p in sorted(OUT.rglob('*')):
        if p.is_file() and p.name != 'manifest.json' and p.name != 'README.md':
            records.append({'path':p.relative_to(OUT).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'origin':'Original synthetic teaching asset','license':'CC-BY-4.0'})
    write('manifest.json',json.dumps({'synthetic':True,'author':'Evidence First OSINT contributors','generated_for':'v1.0.0','files':records},ensure_ascii=False,indent=2)+'\n')


def make_media():
    (OUT/'media').mkdir(exist_ok=True)
    font_path = next((p for p in [Path('/System/Library/Fonts/Supplemental/Arial.ttf'),Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')] if p.exists()),None)
    def font(size):
        return ImageFont.truetype(str(font_path),size) if font_path else ImageFont.load_default(size=size)
    def frame(n):
        im = Image.new('RGB',(1200,760),'#f4f1e8')
        d = ImageDraw.Draw(im)
        d.rectangle((0,0,1200,64),fill='#153445');d.text((25,15),'SYNTHETIC / TRAINING ILLUSTRATION',font=font(28),fill='white')
        d.rectangle((0,330,1200,535),fill='#75b3c0')
        d.polygon([(515,180),(680,180),(760,700),(430,700)],fill='#677b80')
        d.line((535,180,450,700),fill='white',width=9);d.line((660,180,742,700),fill='white',width=9)
        d.rectangle((160,200,290,310),fill='#b48763');d.rectangle((182,310,202,370),fill='#46545c');d.rectangle((250,310,270,370),fill='#46545c')
        d.text((130,140),'W: SQUARE TOWER',font=font(22),fill='#153445')
        d.rectangle((850,235,1100,320),fill='#956d61')
        for x in [880,960,1040]:d.rectangle((x,135,x+25,240),fill='#66544d')
        d.text((855,95),'E: 3 CHIMNEYS',font=font(22),fill='#153445')
        d.rectangle((425,575,760,604),fill='#fffaf0')
        for x in range(430,750,40):d.polygon([(x,575),(x+20,575),(x+40,604),(x+20,604)],fill='#a73930')
        d.rectangle((775,465,1120,548),fill='#fffaf0',outline='#153445',width=3)
        d.text((800,485),'TEST / NO CARS',font=font(25),fill='#153445')
        d.text((25,690),'FICTIONAL LOCAL GRID — NOT A REAL PLACE',font=font(23),fill='#153445')
        if n == 3:
            for x,y in [(575,380),(630,440)]:
                d.ellipse((x-8,y-25,x+8,y-9),fill='#182b37');d.line((x,y-9,x,y+25),fill='#182b37',width=6)
        if n:d.text((28,80),f'FRAME {n:02d} / synthetic sequence',font=font(25),fill='#153445')
        return im
    original=frame(0)
    exif=Image.Exif();exif[36867]='2025:05:03 09:00:00';exif[270]='SYNTHETIC training illustration; not a photograph';exif[315]='Evidence First OSINT contributors'
    original.save(OUT/'media/original.jpg',quality=92,exif=exif)
    repost=original.crop((60,70,1160,730)).resize((900,540))
    d=ImageDraw.Draw(repost);d.rectangle((0,0,900,44),fill='#153445');d.text((16,10),'SYNTHETIC / REPOST CROP',font=font(23),fill='white')
    repost.save(OUT/'media/repost.jpg',quality=80)
    for n in [1,2,3]:frame(n).save(OUT/f'media/frame-{n:02d}.jpg',quality=90)
    meta={}
    for name in ['original.jpg','repost.jpg']:
        with Image.open(OUT/'media'/name) as im:
            exif = im.getexif()
            meta[name]={'width':im.width,'height':im.height,'DateTimeOriginal':exif.get(36867),
                'OffsetTimeOriginal':exif.get(36881),'timezone_present':bool(exif.get(36881)),
                'GPS_present':34853 in exif,'sha256':hashlib.sha256((OUT/'media'/name).read_bytes()).hexdigest()}
    write('media/metadata.json',json.dumps({'synthetic':True,'method':'Pillow getexif on local generated files; values are editable, not proof of events.','images':meta},ensure_ascii=False,indent=2)+'\n')
    write('archive/photo-record.txt',LABEL+'\nID: A03\nSynthetic archive record; no real web capture.\ncaptured_at: 2025-05-03T10:00:00Z\nsource_url: https://northbridge.example/photo\nlocal_file: media/original.jpg\nsha256: '+meta['original.jpg']['sha256']+'\nThis record is stipulated within the teaching corpus; exact camera exposure time is unknown.\n')
    table('media/frames.csv','frame_id,position_seconds,path,synthetic',[
        ['F01',0,'frame-01.jpg'],['F02',2,'frame-02.jpg'],['F03',4,'frame-03.jpg']])
    if shutil.which('ffmpeg'):
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-framerate','1/2','-i',str(OUT/'media/frame-%02d.jpg'),'-vf','fps=12,format=yuv420p','-c:v','libx264','-movflags','+faststart','-metadata','comment=SYNTHETIC teaching sequence; not a real recording',str(OUT/'media/training-clip.mp4')],check=True)
    svg='''<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="560" viewBox="0 0 1000 560" role="img" aria-labelledby="t d"><title id="t">Synthetic local map: candidates A and B</title><desc id="d">Fictional metre grid, north up. A is at 200,300 with a square tower west and a three chimney factory east. B at 700,300 reverses those landmarks. No real coordinates.</desc><rect width="1000" height="560" fill="#f4f1e8"/><g font-family="sans-serif" fill="#153445"><text x="30" y="38" font-size="24">SYNTHETIC MAP / LOCAL METRES / NOT WGS84</text><path d="M900 140V65L888 85M900 65L912 85" stroke="#153445" stroke-width="4" fill="none"/><text x="925" y="84" font-size="22">N</text><path d="M0 255H1000" stroke="#75b3c0" stroke-width="80"/><g fill="#667a80"><rect x="215" y="210" width="60" height="220"/><rect x="715" y="210" width="60" height="220"/></g><g fill="#b48763"><rect x="100" y="190" width="55" height="55"/><rect x="855" y="190" width="55" height="55"/></g><g fill="#956d61"><path d="M350 240V200H370V170H380V200H395V170H405V200H420V170H430V240Z"/><path d="M550 240V200H570V170H580V200H595V170H605V200H620V170H630V240Z"/></g><text x="182" y="470" font-size="24">A (200,300)</text><text x="682" y="470" font-size="24">B (700,300)</text><text x="90" y="170" font-size="18">tower</text><text x="345" y="150" font-size="18">factory</text><text x="545" y="150" font-size="18">factory</text><text x="850" y="170" font-size="18">tower</text><path d="M50 510H150M50 502V518M150 502V518" stroke="#153445" stroke-width="3"/><text x="170" y="518" font-size="18">100 local metres; schematic positions only</text></g></svg>'''
    write('map.svg',svg)
    write('media/scene.svg','''<svg xmlns="http://www.w3.org/2000/svg" width="960" height="360" viewBox="0 0 960 360" role="img" aria-labelledby="t d"><title id="t">Synthetic scene orientation</title><desc id="d">Tower west, bridge centre, factory east, barrier south. These are exercise landmarks, not a photograph.</desc><rect width="960" height="360" fill="#f4f1e8"/><g fill="#153445" font-family="sans-serif"><text x="30" y="40" font-size="25">SYNTHETIC / TRAINING SCENE</text><text x="40" y="160" font-size="25">W: square tower</text><text x="370" y="160" font-size="25">bridge</text><text x="640" y="160" font-size="25">E: 3 chimneys</text><text x="340" y="295" font-size="25">S: striped barrier</text><path d="M280 150H345M475 150H610M435 200V245" stroke="#153445" stroke-width="3"/></g></svg>''')


if __name__ == '__main__':
    main()
