#!/usr/bin/env node
const fs = require('fs');

// Parse the mapping list
const mappingText = `jmartínez	47747144
iramirez	51129663
xpáez	58936275
erosso	50308462
fabdo	48574007
ssantos	50757546
ascapino	53876957
vpalladino	47688201
agestal	49073769
mbrites	41103029
fgonnet	48975996
lolivera	46835984
mfernández	44780753
fferreira	48855227
gaboal	48637639
ffernández	47857763
mnicolini	47228722
aperdomo	50937328
mchocho	28976411
lvera	56180660
myiansens	48521618
vbernasconi	44615512
sangüilla	48676267
jgarcia	58368991
mzinnato	25098000
gesposto	46706006
mneves	49961120
macosta	40024703
vormazabal	33079173
esosa	51062201
cdíaz	45818462
bsilvestri	48889294
gparedes	51050993
mortiz	47309302
ggimenez	63264112
dclavell	51747691
lconti	19471408
vvalentina	41688136
cmachado	52915467
sgelso	17759276
jrosano	54452061
vramirez	54892469
jpereira	48223472
ccastro	49787110
igonzález	56398459
smiguel	47600932
garén	44636960
ncamaño	56123119
lcabrera	16242008
jsosa	55563704
aduce	41687875
lfrizzi	51565758
svázquez	53843928
nbichinque	41572137
epieri	17281308
adíaz	47416195
cinzaurralde	50357394
nviera	49738777
jgoicoechea	53256818
rdominzain	46774576
drosati	403363365
rferreira	52467959
rsilva	48820240
cmarrero	48926804
mgimenez	44363331
daguiar	4073818579
amartínez	19274939
jdavid	95049165
cantúnez	40657217
sdri	66937247
cbuonomo	47199399
sferreira	50914483
vgoyret	48766200
mpla	58500440
acarbonell	46791348
jabreu	46434578
hgómez	42759087
jcardozo	43345702
mgonzalez	28818390
mnavarrine	49055620
mleites	17079604
ppereyra	46554407
itoribio	53326162
aleoni	18118984
jflores	45826081
rlión	52644212
nrodríguez	43573923
mpaula	45520859
golazabal	49000283
msosa	55078428
sdraper	51351012
vpérez	36416685
mméndez	49180972
nsuárez	48828929
abentancor	28754673
ahu	51083687
cgómez	55126988
nvarela	38677661
mbarceló	14987018
fgomez	51215923
alongo	30968002
fpieri	27796525
cpacheco	44402018
mpouso	34515625
mcantero	43103560
lbritos	37244166
vsosa	51298474
dmalleville	43810935
cbarate	42383965
selgart	52626634
ntolstoy	49058707
scrida	45877381
bdho	49258563
jsantos	49996674
rgonzalez	54195774
crodríguez	30830106
kcasavieja	40401349
dgonzález	34753338
adominzain	48904703
adeganello	47786841
jsanabria	45876387
nchiesa	40984436
criesgo	46775172
fguridi	34587721
adelfino	47965908
pferragut	33712278
psuarez	42742428
dsilva	55302673
mméndez	33464601
fleoni	36846256
asaavedra	28966452
mchirino	64044630
gvallarino	18427854
rhernandez	47804465
smoreno	18654849
rsosa	49068584
cogara	45310727
jpereyra	43063839
vastapenco	44983163
fmello	47091464
scampot	50941509
scaballero	50900296
rmoncada	64055988
imarquez	47826704
amanzi	44260832
hduarte	42311568
ngarcía	48378275
cbarceló	49355789
tgarula	56988969
svilches	48326357
llloveras	54687810
jdamian	45261508
mlozano	43828231
lfernández	28233065
gsuárez	47397420
jfuentes	13260279
fabdo	48574007
jpirez	45640932
mcabrera	44598992
lguedes	48756150
btexeira	50847545
lfornaroli	38224127
labdo	28518582
driesgo	14848563
priesgo	46775188
lferreira	35589514
abengochea	45326570
eromero	13241807
msosa	27247427
nnavascues	52413851
creyes	47669889
jbarceló	52246002
flemos	49283120
msaavedra	38487466
akent	47621380
ppinazzo	46389866
gmarmissolle	45861174
asosa	52328363
curioste	54068292
mnogueira	43774175
echá	48929975
lfuente	60448919
vpérez	44709959
fgonzález	49149653
mrisvegliato	47452248
ssánchez	49297527
dfuentes	422262559
fandrioli	46757077
mriesgo	52446909
fmangold	51010208
vestigarribia	61747984
jpaez	58728094
cgonzalez	50515837
lguardia	48435637
mbonino	17724506
fprieto	47560342
ngranero	57802556
nzinoveev	54959837
rpla	44367616
ediaz	51881685
pgalíndez	19799628
lprieto	50504567
ppouso	29509324
gloprete	56988947
aolariaga	34599590
lchiappara	18243402
aibero	34821888
gducer	51068681
hbermúdez	27966031
falvarez	54591657
ógutiérrez	15074141
lfleitas	40866408
fgargaglioni	52079281
jsilva	50320212
fmartínez	49374850
agonzález	40899277
ggonzález	44153481
vpinazzo	38858776
nquiroga	48391342
rcorrea	54070174
eberón	52111697
ebarrera	47570793
fgatti	51713000`;

const mapping = {};
mappingText.split('\n').forEach(line => {
  const [name, ci] = line.trim().split(/\s+/);
  if (name && ci) mapping[ci] = name;
});

// Read and update admins.json
const admins = JSON.parse(fs.readFileSync('./src/data/admins.json', 'utf8'));
let updated = 0;

admins.forEach(admin => {
  if (mapping[admin.ci]) {
    admin.username = mapping[admin.ci];
    updated++;
  }
});

fs.writeFileSync('./src/data/admins.json', JSON.stringify(admins, null, 2), 'utf8');
console.log(`Updated ${updated} usernames based on ci mapping`);
