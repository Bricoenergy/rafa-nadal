// Genera ../index.html a partir de template.html, mapdata.json y las imágenes de relieve.
import fs from 'fs';
const t=fs.readFileSync('template.html','utf8'); const d=JSON.parse(fs.readFileSync('mapdata.json','utf8'));
d.relief='data:image/jpeg;base64,'+fs.readFileSync('relief.jpg').toString('base64');
d.reliefCan='data:image/jpeg;base64,'+fs.readFileSync('relief-can.jpg').toString('base64');
const page=t.replace('/*MAPDATA*/null', JSON.stringify(d));
fs.writeFileSync('../index.html', `<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<style>[hidden]{display:none!important}body{margin:0}</style>\n</head>\n<body>\n${page}\n</body>\n</html>\n`);
