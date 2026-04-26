# 🐛 Issue: Mystery
**Дата:** 04-26-2026
**Статус:** #status/solved 

## Описание
Расследовать убийство в терминале используя терминал

## Контекст / Окружение
```bash
❯ tree .
.
├── crimescene
├── interviews
│   ├── interview-000296
│   ├── interview-00448418
│   ├── interview-00502304
│   ├── interview-005702
│   ├── interview-00617019
│   ├── interview-00805135
│   ├── interview-016463
│   ├── interview-020337
│   ├── interview-022751
│   ├── interview-0234126
│   ├── interview-02422821
│   ├── interview-0251720
│   ├── interview-03098229
│   ├── interview-0315125
│   ├── interview-03316077
│   ├── interview-034070
│   ├── interview-0349327
│   ├── interview-04393507
│   ├── interview-044492
│   ├── interview-0462097
│   ├── interview-049721
│   ├── interview-05297663
│   ├── interview-06032377
│   ├── interview-0613334
│   ├── interview-066291
│   ├── interview-071537
│   ├── interview-0732631
│   ├── interview-07497003
│   ├── interview-0768255
│   ├── interview-092423
│   ├── interview-0953437
│   ├── interview-096267
│   ├── interview-102490
│   ├── interview-109118
│   ├── interview-1108561
│   ├── interview-114661
│   ├── interview-11495001
│   ├── interview-116803
│   ├── interview-11705111
│   ├── interview-11783660
│   ├── interview-11817172
│   ├── interview-1186827
│   ├── interview-1205060
│   ├── interview-1250176
│   ├── interview-125204
│   ├── interview-125271
│   ├── interview-1269181
│   ├── interview-1310392
│   ├── interview-13768464
│   ├── interview-13889608
│   ├── interview-13920860
│   ├── interview-1395414
│   ├── interview-141030
│   ├── interview-14153840
│   ├── interview-144873
│   ├── interview-14590717
│   ├── interview-147283
│   ├── interview-15187437
│   ├── interview-15354942
│   ├── interview-1536668
│   ├── interview-155049
│   ├── interview-1578206
│   ├── interview-159848
│   ├── interview-16098538
│   ├── interview-1642421
│   ├── interview-1643440
│   ├── interview-16889008
│   ├── interview-17248453
│   ├── interview-17343208
│   ├── interview-174898
│   ├── interview-1767435
│   ├── interview-17827186
│   ├── interview-179719
│   ├── interview-1811770
│   ├── interview-18193261
│   ├── interview-1823688
│   ├── interview-18270219
│   ├── interview-18441251
│   ├── interview-1850922
│   ├── interview-1857368
│   ├── interview-1906958
│   ├── interview-191206
│   ├── interview-19300543
│   ├── interview-1933118
│   ├── interview-19577850
│   ├── interview-2058907
│   ├── interview-210355
│   ├── interview-218131
│   ├── interview-221039
│   ├── interview-223913
│   ├── interview-2277882
│   ├── interview-229443
│   ├── interview-23167806
│   ├── interview-2326746
│   ├── interview-23371263
│   ├── interview-233800
│   ├── interview-2415821
│   ├── interview-243703
│   ├── interview-2481877
│   ├── interview-250112
│   ├── interview-253705
│   ├── interview-255531
│   ├── interview-25582311
│   ├── interview-25834905
│   ├── interview-259909
│   ├── interview-2601508
│   ├── interview-26373485
│   ├── interview-2642139
│   ├── interview-27042476
│   ├── interview-27504937
│   ├── interview-275706
│   ├── interview-279087
│   ├── interview-280877
│   ├── interview-2834518
│   ├── interview-284560
│   ├── interview-2846076
│   ├── interview-289524
│   ├── interview-290346
│   ├── interview-291440
│   ├── interview-2922290
│   ├── interview-29316965
│   ├── interview-2939888
│   ├── interview-296128
│   ├── interview-29680692
│   ├── interview-29741223
│   ├── interview-2976680
│   ├── interview-29838622
│   ├── interview-2995681
│   ├── interview-301018
│   ├── interview-30259493
│   ├── interview-3049045
│   ├── interview-305694
│   ├── interview-305949
│   ├── interview-306616
│   ├── interview-3074127
│   ├── interview-3099757
│   ├── interview-312546
│   ├── interview-3128999
│   ├── interview-3140662
│   ├── interview-31635890
│   ├── interview-3201508
│   ├── interview-322305
│   ├── interview-32365018
│   ├── interview-324389
│   ├── interview-325611
│   ├── interview-32639981
│   ├── interview-32712166
│   ├── interview-331178
│   ├── interview-332596
│   ├── interview-33399976
│   ├── interview-340396
│   ├── interview-34041151
│   ├── interview-342393
│   ├── interview-34359897
│   ├── interview-344331
│   ├── interview-34690644
│   ├── interview-347303
│   ├── interview-351963
│   ├── interview-353218
│   ├── interview-353467
│   ├── interview-354262
│   ├── interview-3588302
│   ├── interview-3609204
│   ├── interview-36398447
│   ├── interview-364735
│   ├── interview-36527398
│   ├── interview-376115
│   ├── interview-37747405
│   ├── interview-3804339
│   ├── interview-3824641
│   ├── interview-38299069
│   ├── interview-3871205
│   ├── interview-3871242
│   ├── interview-38899905
│   ├── interview-3917097
│   ├── interview-391811
│   ├── interview-39481114
│   ├── interview-39825862
│   ├── interview-40534453
│   ├── interview-40610944
│   ├── interview-409731
│   ├── interview-41553314
│   ├── interview-416243
│   ├── interview-41814745
│   ├── interview-4204949
│   ├── interview-42161907
│   ├── interview-4223536
│   ├── interview-4225866
│   ├── interview-42396365
│   ├── interview-4262657
│   ├── interview-42934869
│   ├── interview-4299898
│   ├── interview-4335306
│   ├── interview-4366523
│   ├── interview-44533008
│   ├── interview-4463090
│   ├── interview-448086
│   ├── interview-45615686
│   ├── interview-457117
│   ├── interview-457451
│   ├── interview-466195
│   ├── interview-4673074
│   ├── interview-46773428
│   ├── interview-47246024
│   ├── interview-4735823
│   ├── interview-4765278
│   ├── interview-476744
│   ├── interview-478217
│   ├── interview-48088300
│   ├── interview-48148020
│   ├── interview-483817
│   ├── interview-485229
│   ├── interview-4950099
│   ├── interview-4961376
│   ├── interview-496772
│   ├── interview-498331
│   ├── interview-499096
│   ├── interview-50168425
│   ├── interview-50291987
│   ├── interview-504687
│   ├── interview-509105
│   ├── interview-5143029
│   ├── interview-514793
│   ├── interview-52280505
│   ├── interview-528044
│   ├── interview-529706
│   ├── interview-53318557
│   ├── interview-535181
│   ├── interview-5372865
│   ├── interview-538900
│   ├── interview-54026669
│   ├── interview-541518
│   ├── interview-5455315
│   ├── interview-54619323
│   ├── interview-54851634
│   ├── interview-549055
│   ├── interview-55382746
│   ├── interview-55410365
│   ├── interview-55435298
│   ├── interview-55477243
│   ├── interview-555536
│   ├── interview-5581158
│   ├── interview-55841398
│   ├── interview-55984022
│   ├── interview-565396
│   ├── interview-566707
│   ├── interview-56784802
│   ├── interview-56892213
│   ├── interview-57236791
│   ├── interview-5739404
│   ├── interview-5766907
│   ├── interview-5774468
│   ├── interview-5782759
│   ├── interview-579105
│   ├── interview-5835471
│   ├── interview-586668
│   ├── interview-58910793
│   ├── interview-5905106
│   ├── interview-591273
│   ├── interview-5993978
│   ├── interview-60081985
│   ├── interview-604403
│   ├── interview-608607
│   ├── interview-6093093
│   ├── interview-618764
│   ├── interview-6203192
│   ├── interview-628618
│   ├── interview-63308519
│   ├── interview-637657
│   ├── interview-637928
│   ├── interview-638121
│   ├── interview-6417794
│   ├── interview-645385
│   ├── interview-6553472
│   ├── interview-65792229
│   ├── interview-659803
│   ├── interview-66101490
│   ├── interview-66282920
│   ├── interview-6643191
│   ├── interview-67279454
│   ├── interview-673985
│   ├── interview-676473
│   ├── interview-67790846
│   ├── interview-680549
│   ├── interview-6808205
│   ├── interview-68195573
│   ├── interview-68488577
│   ├── interview-68764140
│   ├── interview-6884359
│   ├── interview-6894000
│   ├── interview-69170457
│   ├── interview-6933068
│   ├── interview-699607
│   ├── interview-70067280
│   ├── interview-70199425
│   ├── interview-703831
│   ├── interview-704443
│   ├── interview-70458099
│   ├── interview-7046684
│   ├── interview-7066082
│   ├── interview-706620
│   ├── interview-707438
│   ├── interview-708943
│   ├── interview-7103823
│   ├── interview-71186817
│   ├── interview-71226767
│   ├── interview-71298441
│   ├── interview-7180973
│   ├── interview-71993338
│   ├── interview-720268
│   ├── interview-7254073
│   ├── interview-728181
│   ├── interview-730123
│   ├── interview-73035802
│   ├── interview-7305678
│   ├── interview-73585672
│   ├── interview-737609
│   ├── interview-7422077
│   ├── interview-74225310
│   ├── interview-7469675
│   ├── interview-7541406
│   ├── interview-75434722
│   ├── interview-755037
│   ├── interview-75633580
│   ├── interview-7580872
│   ├── interview-77014856
│   ├── interview-770439
│   ├── interview-77135281
│   ├── interview-7791374
│   ├── interview-780255
│   ├── interview-7863761
│   ├── interview-789564
│   ├── interview-791289
│   ├── interview-79360358
│   ├── interview-79411932
│   ├── interview-794525
│   ├── interview-7959148
│   ├── interview-796439
│   ├── interview-79667499
│   ├── interview-79935965
│   ├── interview-7998181
│   ├── interview-8095917
│   ├── interview-809922
│   ├── interview-812725
│   ├── interview-81443363
│   ├── interview-822576
│   ├── interview-8245680
│   ├── interview-825165
│   ├── interview-82705993
│   ├── interview-831512
│   ├── interview-833367
│   ├── interview-838259
│   ├── interview-8387710
│   ├── interview-8402388
│   ├── interview-8421696
│   ├── interview-8464899
│   ├── interview-84688694
│   ├── interview-849256
│   ├── interview-85262552
│   ├── interview-8531248
│   ├── interview-856221
│   ├── interview-8586380
│   ├── interview-861780
│   ├── interview-862173
│   ├── interview-862717
│   ├── interview-8631232
│   ├── interview-86395001
│   ├── interview-865918
│   ├── interview-867999
│   ├── interview-8700943
│   ├── interview-87126591
│   ├── interview-871877
│   ├── interview-879569
│   ├── interview-8819490
│   ├── interview-891720
│   ├── interview-896668
│   ├── interview-9004767
│   ├── interview-901603
│   ├── interview-901645
│   ├── interview-90394637
│   ├── interview-904020
│   ├── interview-907126
│   ├── interview-9074626
│   ├── interview-911451
│   ├── interview-91673757
│   ├── interview-917210
│   ├── interview-9185205
│   ├── interview-920304
│   ├── interview-92391023
│   ├── interview-92670500
│   ├── interview-927642
│   ├── interview-9332386
│   ├── interview-9346061
│   ├── interview-93473333
│   ├── interview-93696502
│   ├── interview-938991
│   ├── interview-9408565
│   ├── interview-94126412
│   ├── interview-9437737
│   ├── interview-944493
│   ├── interview-9446528
│   ├── interview-9501580
│   ├── interview-95095182
│   ├── interview-95601730
│   ├── interview-9618669
│   ├── interview-9620713
│   ├── interview-9651888
│   ├── interview-9666149
│   ├── interview-97043057
│   ├── interview-9709892
│   ├── interview-9711852
│   ├── interview-9712946
│   ├── interview-9728756
│   ├── interview-97393699
│   ├── interview-97409610
│   ├── interview-980963
│   ├── interview-982013
│   ├── interview-9824821
│   ├── interview-98912259
│   ├── interview-9901455
│   ├── interview-9912172
│   ├── interview-992072
│   ├── interview-99643550
│   ├── interview-9969223
│   └── interview-999372
├── memberships
│   ├── AAA
│   ├── AAdvantage
│   ├── Costco
│   ├── Delta_SkyMiles
│   ├── Fitness_Galaxy
│   ├── Museum_of_Bash_History
│   ├── REI
│   ├── Rotary_Club
│   ├── TCSU_Alumni_Association
│   ├── Terminal_City_Library
│   └── United_MileagePlus
├── people
├── streets
│   ├── Abbot_Street
│   ├── Acton_Street
│   ├── Addington_Road
│   ├── Alaric_Street
│   ├── Albany_Street
│   ├── Aldworth_Street
│   ├── Alpine_Street
│   ├── Andover_Road
│   ├── Ansonia_Road
│   ├── Appleton_Road
│   ├── Aramon_Street
│   ├── Arcola_Street
│   ├── Atwood_Road
│   ├── Auriga_Street
│   ├── Avalon_Road
│   ├── Ballard_Street
│   ├── Balmoral_Park
│   ├── Bartlett_Avenue
│   ├── Bellevue_Avenue
│   ├── Bertson_Avenue
│   ├── Bicknell_Street
│   ├── Blue_Hill_Avenue
│   ├── Bobolink_Street
│   ├── Boston_Street
│   ├── Bothwell_Road
│   ├── Bournedale_Road
│   ├── Boynton_Street
│   ├── Brinton_Street
│   ├── Bristol_Street
│   ├── Broad_Canal_Street
│   ├── Brookdale_Street
│   ├── Brookline_Avenue
│   ├── B_Street
│   ├── Buckingham_Place
│   ├── Burwell_Road
│   ├── Cadbury_Road
│   ├── Cardinal_Medeiros_Avenue
│   ├── Cardington_Street
│   ├── Causeway_Street
│   ├── Cerdan_Avenue
│   ├── Channel_Center_Street
│   ├── Cheverus_Road
│   ├── Claremont_Park
│   ├── Claybourne_Street
│   ├── Clay_Street
│   ├── Clipper_Ship_Lane
│   ├── Cook_Street
│   ├── Cornelia_Street
│   ├── Corwin_Street
│   ├── Culbert_Street
│   ├── Dacia_Street
│   ├── Dalton_Street
│   ├── Dana_Avenue
│   ├── Davenport_Street
│   ├── Devine_Way
│   ├── Dewar_Street
│   ├── Doane_Street
│   ├── Dock_Street
│   ├── Dorrance_Street
│   ├── Dover_Street
│   ├── Dresser_Street
│   ├── Drumlin_Road
│   ├── Dunstable_Road
│   ├── Elmore_Street
│   ├── Embassy_Road
│   ├── Enterprise_Street
│   ├── Esther_Road
│   ├── Estrella_Street
│   ├── Eugenia_Road
│   ├── Fairfield_Street
│   ├── Faunce_Road
│   ├── Fayston_Street
│   ├── Fay_Street
│   ├── Fessenden_Street
│   ├── Forestvale_Road
│   ├── Foundry_Street
│   ├── Fowler_Street
│   ├── Frontage_Road
│   ├── Gerard_Street
│   ├── Gillespies_Lane
│   ├── Glenville_Avenue
│   ├── Glenwood_Avenue
│   ├── Grampian_Way
│   ├── Granby_Street
│   ├── Gray_Gardens_East
│   ├── Greendale_Road
│   ├── Gretter_Road
│   ├── Groveland_Street
│   ├── Hadassah_Way
│   ├── Haley_Street
│   ├── Harbor_Point_Boulevard
│   ├── Harding_Road
│   ├── Hart_Place
│   ├── Hazel_Street
│   ├── Hazelton_Street
│   ├── High_Road
│   ├── High_View_Avenue
│   ├── Hobart_Street
│   ├── Hollander_Street
│   ├── Hooten_Court
│   ├── Hopedale_Street
│   ├── Hull_Street
│   ├── Island_View_Place
│   ├── Jacob_Street
│   ├── Jacqueline_Road
│   ├── Jamaica_Place
│   ├── Jersey_Street
│   ├── Jeshurun_Street
│   ├── John_Alden_Road
│   ├── Judge_Street
│   ├── June_Street
│   ├── Kearsarge_Avenue
│   ├── King_Place
│   ├── Kinross_Road
│   ├── Knoll_Street
│   ├── Laban_Pratt_Road
│   ├── Leseur_Road
│   ├── Lineham_Court
│   ├── Lovis_Street
│   ├── Lynde_Street
│   ├── Lynn_Street
│   ├── Mamelon_Circle
│   ├── Manila_Avenue
│   ├── Manton_Terrace
│   ├── Marney_Street
│   ├── Mattapan_Street
│   ├── May_Street
│   ├── Meadowview_Road
│   ├── Merola_Park
│   ├── Michigan_Avenue
│   ├── Miles_Street
│   ├── Moloney_Street
│   ├── Mountain_Avenue
│   ├── Mount_Ash_Road
│   ├── Mount_Ida_Road
│   ├── Mozart_Street
│   ├── Myles_Standish_Road
│   ├── Mystic_Street
│   ├── Nazing_Street
│   ├── Newcastle_Road
│   ├── Newcroft_Circle
│   ├── New_Minton_Street
│   ├── New_Park_Avenue
│   ├── North_Washington_Street
│   ├── Norton_Street
│   ├── Oak_Hill_Avenue
│   ├── Oakley_Street
│   ├── Oak_Place
│   ├── Oliva_Road
│   ├── Orchard_Road
│   ├── Paragon_Road
│   ├── Peacock_Lane
│   ├── Peter_Parley_Road
│   ├── Pinewood_Street
│   ├── Plainfield_Street
│   ├── Plain_Street
│   ├── Potosi_Street
│   ├── Priscilla_Road
│   ├── Proctor_Street
│   ├── Quarley_Road
│   ├── Randlett_Place
│   ├── Rena_Street
│   ├── Renfrew_Street
│   ├── Richard_Avenue
│   ├── Richardson_Street
│   ├── Richmond_Street
│   ├── Rivermoor_Street
│   ├── River_Street
│   ├── Rockmere_Street
│   ├── Rosaria_Street
│   ├── Rowe_Street
│   ├── Rozella_Street
│   ├── Saco_Street
│   ├── Saint_Saveur_Court
│   ├── Salutation_Street
│   ├── Sammett_Avenue
│   ├── Saunders_Street
│   ├── Scotia_Street
│   ├── Searle_Road
│   ├── Selwyn_Street
│   ├── Senders_Court
│   ├── Sheldon_Street
│   ├── Silver_Street
│   ├── Sparrow_Street
│   ├── Spaulding_Street
│   ├── Standard_Street
│   ├── Staniford_Street
│   ├── Story_Street
│   ├── Supple_Road
│   ├── Taunton_Avenue
│   ├── Tennyson_Street
│   ├── Terrace_Place
│   ├── Theodore_Street
│   ├── Tolman_Street
│   ├── Topeka_Street
│   ├── Trapelo_Street
│   ├── Trident_Street
│   ├── Trinity_Place
│   ├── Unity_Court
│   ├── Vassal_Lane
│   ├── Victory_Road
│   ├── Vinton_Street
│   ├── Vista_Street
│   ├── Waldeck_Street
│   ├── Wallingford_Road
│   ├── Warren_Avenue
│   ├── Wentworth_Street
│   ├── Wesley_Place
│   ├── Wheatland_Avenue
│   ├── Wiget_Street
│   ├── Wiggin_Street
│   ├── Wilcox_Road
│   ├── Wilkinson_Park
│   ├── Willet_Street
│   ├── Williston_Road
│   ├── Willowdean_Avenue
│   ├── Wilmington_Avenue
│   ├── Winter_Street
│   ├── Woodcliff_Street
│   ├── Wooddale_Avenue
│   ├── Worrell_Street
│   └── Wycliff_Avenue
└── vehicles

4 directories, 661 files
```

## Ход расследования

- [ ] Шаг 1: Скачать zip архив
- [ ] Шаг 2: Разорхивировать архив
- [ ] Шаг 3: Перейти в дерикторию mystery 
- [ ] Шаг 4: В файлах много мусора. Пока что зацепок нету... поэтому выполним команду по ключевому слову CLUE по файлу crimscene:
```bash
grep -i "clue" crimescene
```
Вывод
```plaintext
CLUE: Footage from an ATM security camera is blurry but shows that the perpetrator is a tall male, at least 6'.
CLUE: Found a wallet believed to belong to the killer: no ID, just loose change, and membership cards for AAA, Delta SkyMiles, the local library, and the Museum of Bash History. The cards are totally untraceable and have no name, for some reason.
CLUE: Questioned the barista at the local coffee shop. He said a woman left right before they heard the shots. The name on her latte was Annabel, she had blond spiky hair and a New Zealand accent.
```
Что нам известно:
- Male (M)
- Рост 6 футов
- Состоит в AAA, Delta SkyMiles, the local library, and the Museum of Bash History.
- Свидетель под именем Annabel

- [ ] Шаг 5: Найдем Cвидетеля:
```bash
grep "Annabel" people
```
```plaintext
Annabel Sun	F	26	Hart Place, line 40
Oluwasegun Annabel	M	37	Mattapan Street, line 173
Annabel Church	F	38	Buckingham Place, line 179
Annabel Fuglsang	M	40	Haley Street, line 176
```

Проверим Annabel Sun:
```
❯ grep -i "interview" streets/Hart_Place
SEE INTERVIEW #47246024
```
```
❯ head interviews/interview-47246024
Ms. Sun has brown hair and is not from New Zealand.  Not the witness from the cafe.
```

- Отсекаем ее
- Проверяем Annabel Church
```
❯ grep -i "interview" streets/Buckingham_Place
SEE INTERVIEW #699607
```
```
❯ head interviews/interview-699607
Interviewed Ms. Church at 2:04 pm.  Witness stated that she did not see anyone she could identify as the shooter, that she ran away as soon as the shots were fired.

However, she reports seeing the car that fled the scene.  Describes it as a blue Honda, with a license plate that starts with "L337" and ends with "9"
```

Бинго! Что нам известно теперь:
- Male (M)
- Рост 6 футов
- Состоит в AAA, Delta SkyMiles, the local library, and the Museum of Bash History.
- Синяя хонда
- L337.\*9

- [ ] Шаг 6: Будем искать машины:
```bash
grep -i "L337.*9" -A6 vehicles | grep -i "Honda" -B2 -A5 | grep -i "Blue" -B3 -A4 | grep -i "6'" -B5 -A2 | grep "Owner"
Owner: Erika Owens
Owner: Joe Germuska
Owner: Jeremy Bowers
Owner: Jacqui Maher
```

- Проверим их:
```bash
grep -i "L337.*9" -A6 vehicles | grep -i "Honda" -B2 -A5 | grep -i "Blue" -B3 -A4 | grep -i "6'" -B5 -A2 | grep "Owner" | awk '{print $2 " " $3}' > full_names.txt
```

```bash
grep -f full_names.txt people | grep -vE "*.F.*"

Joe Germuska	M	65	Plainfield Street, line 275
Jeremy Bowers	M	34	Dunstable Road, line 284
```

- [ ] Шаг 7: Проверим где они состоят:
```bash
grep -E "Joe Germuska|Jeremy Bowers" memberships/AAA memberships/Delta_SkyMiles memberships/Terminal_City_Library memberships/Museum_of_Bash_History
```

```plaintext
memberships/AAA:Joe Germuska
memberships/AAA:Jeremy Bowers
memberships/Delta_SkyMiles:Jeremy Bowers
memberships/Terminal_City_Library:Joe Germuska
memberships/Terminal_City_Library:Jeremy Bowers
memberships/Museum_of_Bash_History:Jeremy Bowers
```

Joe = 2
Jeremy = 4

- [ ] Шаг 8: Бинго! Мы нашли убийцу, его имя Jeremy Bowers

## Решение

- У нас есть имя теперь проверим:
```bash
echo "Jeremy Bowers" | $(command -v md5 || command -v md5sum) | grep -qif /dev/stdin encoded && echo CORRECT\! GREAT WORK, GUMSHOE. || echo SORRY, TRY AGAIN.
```

- Вывод:
```plaintext
CORRECT! GREAT WORK, GUMSHOE.
```

## Выводы
### ОТЧЕТ ПО РЕЗУЛЬТАТАМ РАССЛЕДОВАНИЯ 
#### 1. Краткое содержание
В ходе проведения оперативно-технических мероприятий с использованием инструментов анализа данных в среде CLI был проведен поиск лица, причастного к инциденту. Исходные данные включали описание внешности (мужчина, рост 6 футов), свидетельские показания по транспортному средству (синяя Honda, номерной знак вида `L337...9`) и принадлежность к ряду организаций.

#### 2. Методология исследования
Идентификация проводилась путем поэтапного сужения выборки подозреваемых:
* **Фильтрация данных:** Использование конвейерной обработки (piping) для анализа ведомостей транспортных средств и списков членов организаций.
* **Анализ показаний:** Исключение свидетелей по критериям внешности и географическим данным (сопоставление с данными интервью).
* **Корреляция данных:** Перекрестная проверка членства в организациях (AAA, Delta SkyMiles, Library, Museum of Bash History).

#### 3. Установленные факты
В результате автоматизированного анализа был выявлен единственный субъект, соответствующий всем заданным параметрам (пол, рост, автотранспорт, членство в организациях):
* **Имя:** Jeremy Bowers.
* **Подтверждение:** Контрольная сумма MD5, полученная из личных данных субъекта, совпала с записью, хранящейся в защищенном реестре (`encoded`).

#### 4. Рекомендации по развитию компетенций
Для повышения эффективности последующих оперативных мероприятий рекомендуется освоить следующие технические стеки:

* **Расширенная текстовая аналитика:** Переход от базовых `grep` к `awk` и `sed` для комплексной обработки массивов данных без создания промежуточных файлов.
* **Работа с форматами обмена данными:** Изучение `jq` для обработки JSON-структур, которые становятся стандартом в современных отчетных ведомостях.
* **Автоматизация пайплайнов:** Практика использования `xargs` для динамической передачи аргументов между процессами, что позволит исключить необходимость в промежуточном сохранении данных.
* **Регулярные выражения (Regex):** Углубленное изучение расширенных шаблонов для поиска сложных неструктурированных идентификаторов.

Для включения в отчет рекомендую следующий список обучающих материалов, ориентированных на повышение квалификации в области анализа данных и работы с командной строкой:

### План профессионального развития (CLI & Data Analysis)

* **Работа с текстовыми потоками (Stream Processing):**
    * *Материалы:* Книга «The AWK Programming Language» (Aho, Kernighan, Weinberger) и интерактивные руководства по `sed` (например, GNU sed manual).
    * *Цель:* Переход от многоэтапной фильтрации к написанию лаконичных однострочных скриптов.
* **Регулярные выражения (Regex):**
    * *Материалы:* Ресурс [RegexOne](https://regexone.com/) и «Mastering Regular Expressions» (Jeffrey Friedl).
    * *Цель:* Построение сложных поисковых запросов для неструктурированных данных.
* **Автоматизация и Shell Scripting:**
    * *Материалы:* Официальный «Advanced Bash-Scripting Guide» (The Linux Documentation Project).
    * *Цель:* Оптимизация рутинных задач, создание модульных скриптов с обработкой ошибок.
* **Современные альтернативы инструментов:**
    * *Материалы:* Документация `ripgrep` (поиск), `fd` (поиск файлов), `jq` (обработка JSON).
    * *Цель:* Повышение производительности труда за счет использования высокоскоростных инструментов нового поколения.
* **Методология расследований (Data Forensics/OSINT):**
    * *Материалы:* Практические платформы, такие как OverTheWire (например, уровень Bandit).
    * *Цель:* Укрепление навыков работы в условиях жестких ограничений и повышение стрессоустойчивости при анализе «зашумленных» данных.