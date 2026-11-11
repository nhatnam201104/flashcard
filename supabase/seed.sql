-- ============================================================================
-- seed.sql — CHỈ DÙNG LOCAL DEV
-- 1) Tạo user test (email: nam@test.local / mật khẩu: aptis2026)
-- 2) Nạp ~100 thẻ Aptis thật (10 chủ đề), trộn stage/next_review
-- 3) Xoá state do trigger tạo rồi gọi fsrs_bootstrap() đúng đường production
-- ============================================================================

-- 1) User test (bcrypt qua pgcrypto; trigger on_auth_user_created tự tạo user_settings)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, email_change_confirm_status, reauthentication_token, phone_change, phone_change_token
)
values (
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
  'authenticated', 'authenticated',
  'nam@test.local', crypt('aptis2026', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  '', '', '', '',
  '', 0, '', '', ''
)
on conflict do nothing;

-- 2) Thẻ từ vựng (stage/next_review trộn để có đủ: mới + đến hạn + chưa đến hạn)
insert into cards (word, ipa, pos, meaning_vi, definition_en, examples, collocations, synonyms, topic, level, source, stage, next_review, lapses) values
-- WORK ---------------------------------------------------------------
('deadline','/ˈdedlaɪn/','n','hạn chót, thời hạn cuối','the latest time by which something must be finished','["We must meet the deadline for the report.","The deadline has been extended by a week."]','{"meet a deadline","tight deadline"}','{"cutoff","due date"}','Work','B1','lesson',2, current_date - 1, 0),
('colleague','/ˈkɒliːɡ/','n','đồng nghiệp','a person you work with','["She discussed the plan with her colleagues."]','{"close colleague","senior colleague"}','{"co-worker","coworker"}','Work','B1','lesson',2, current_date - 2, 0),
('promotion','/prəˈməʊʃn/','n','sự thăng chức','a move to a higher, more important position at work','["He was given a promotion after five years."]','{"get a promotion","deserve a promotion"}','{"advancement","elevation"}','Work','B2','lesson',1, current_date - 1, 1),
('redundant','/rɪˈdʌndənt/','adj','bị cắt giảm, thừa','no longer needed for a job','["Twenty workers were made redundant."]','{"make somebody redundant","be made redundant"}','{"superfluous","unnecessary"}','Work','B2','lesson',0, current_date, 0),
('negotiate','/nɪˈɡəʊʃieɪt/','v','đàm phán, thương lượng','to discuss something to reach an agreement','["They negotiated a better salary."]','{"negotiate a deal","negotiate with somebody"}','{"bargain","discuss terms"}','Work','B2','lesson',2, current_date - 3, 0),
('workload','/ˈwɜːkləʊd/','n','khối lượng công việc','the amount of work a person has to do','["Teachers face a heavy workload."]','{"heavy workload","reduce the workload"}','{"amount of work"}','Work','B1','lesson',3, current_date + 2, 0),
('recruit','/rɪˈkruːt/','v','tuyển dụng','to find new people to work for a company','["The firm is recruiting new staff."]','{"recruit staff","recruit new members"}','{"hire","employ"}','Work','B2','lesson',0, current_date, 0),
('incentive','/ɪnˈsentɪv/','n','động lực, khuyến khích','something that encourages a person to do something','["Bonuses are an incentive to work harder."]','{"financial incentive","strong incentive"}','{"motivation","stimulus"}','Work','C1','lesson',1, current_date - 2, 0),
('resign','/rɪˈzaɪn/','v','từ chức','to officially leave a job','["She resigned from her post last month."]','{"resign from a job","resign over something"}','{"quit","step down"}','Work','B2','lesson',0, current_date, 0),
('entrepreneur','/ˌɒntrəprəˈnɜː(r)/','n','doanh nhân','a person who starts a business and takes on financial risk','["Young entrepreneurs need support and mentoring."]','{"successful entrepreneur","budding entrepreneur"}','{"businessperson","founder"}','Work','B2','lesson',2, current_date - 1, 1),
-- EDUCATION ----------------------------------------------------------
('curriculum','/kəˈrɪkjələm/','n','chương trình học','the subjects studied at a school or college','["The school curriculum includes art and music."]','{"school curriculum","core curriculum"}','{"syllabus","programme"}','Education','B2','lesson',2, current_date - 2, 0),
('assessment','/əˈsesmənt/','n','sự đánh giá','the act of judging a student''s ability or quality','["Continuous assessment reduces exam pressure."]','{"formative assessment","assessment criteria"}','{"evaluation","appraisal"}','Education','B2','lesson',1, current_date - 1, 0),
('scholarship','/ˈskɒləʃɪp/','n','học bổng','money given to a student to pay for their studies','["She won a scholarship to study abroad."]','{"win a scholarship","full scholarship"}','{"grant","bursary"}','Education','B1','lesson',2, current_date - 1, 0),
('tuition','/tjuˈɪʃn/','n','học phí; sự dạy kèm','teaching, especially in small groups, or the fee for it','["Tuition fees have risen sharply."]','{"tuition fees","private tuition"}','{"teaching","instruction"}','Education','B2','lesson',0, current_date, 0),
('qualification','/ˌkwɒlɪfɪˈkeɪʃn/','n','bằng cấp, trình độ','an exam or course result that proves your ability','["A degree is the minimum qualification for this job."]','{"academic qualification","gain a qualification"}','{"credential","certificate"}','Education','B2','lesson',3, current_date + 4, 0),
('literacy','/ˈlɪtərəsi/','n','chữ viết, năng lực đọc viết','the ability to read and write','["Digital literacy is essential today."]','{"basic literacy","computer literacy"}','{"reading ability"}','Education','B2','lesson',1, current_date, 0),
('pedagogy','/ˈpedəɡɒdʒi/','n','khoa học giáo dục, phương pháp giảng dạy','the theory and method of teaching','["Modern pedagogy favours learner-centred classes."]','{"critical pedagogy","pedagogy of learning"}','{"teaching method"}','Education','C1','lesson',0, current_date, 0),
('dropout','/ˈdrɒpaʊt/','n','người bỏ học','a person who leaves school without finishing','["The programme aims to reduce the dropout rate."]','{"school dropout","dropout rate"}','{"leaver"}','Education','B2','lesson',0, current_date, 0),
('discipline','/ˈdɪsəplɪn/','n','kỷ luật; sự rèn luyện','training people to follow rules and control behaviour','["Good discipline starts in the classroom."]','{"maintain discipline","self-discipline"}','{"order","control"}','Education','B2','lesson',2, current_date - 1, 0),
('mandatory','/ˈmændətəri/','adj','bắt buộc','required by law or rules','["School attendance is mandatory until sixteen."]','{"mandatory training","mandatory requirement"}','{"compulsory","obligatory"}','Education','C1','lesson',1, current_date - 1, 0),
-- TRAVEL -------------------------------------------------------------
('itinerary','/aɪˈtɪnərəri/','n','lịch trình','a planned route or schedule for a journey','["Our itinerary includes three cities."]','{"detailed itinerary","travel itinerary"}','{"route","schedule"}','Travel','B2','lesson',2, current_date - 1, 0),
('accommodation','/əˌkɒməˈdeɪʃn/','n','chỗ ở','a place to stay or live','["The price includes flights and accommodation."]','{"book accommodation","student accommodation"}','{"lodging","housing"}','Travel','B1','lesson',2, current_date - 2, 0),
('destination','/ˌdestɪˈneɪʃn/','n','điểm đến','a place where people travel to','["Thailand is a popular tourist destination."]','{"tourist destination","final destination"}','{"resort","stopover"}','Travel','B1','lesson',3, current_date + 5, 0),
('souvenir','/ˌsuːvəˈnɪə(r)/','n','đồ lưu niệm','something you buy to remember a place','["She bought a small souvenir from the trip."]','{"buy a souvenir","souvenir shop"}','{"keepsake","memento"}','Travel','B1','lesson',0, current_date, 0),
('jet lag','/ˈdʒet læɡ/','n','mất ngủ do lệch múi giờ','tiredness caused by travelling across time zones','["I need two days to recover from jet lag."]','{"suffer from jet lag","beat jet lag"}','{"time-zone fatigue"}','Travel','B2','lesson',0, current_date, 0),
('excursion','/ɪkˈskɜːʃn/','n','chuyến tham quan','a short trip made for pleasure','["The hotel offers free excursions."]','{"day excursion","guided excursion"}','{"outing","trip"}','Travel','B2','lesson',1, current_date - 1, 0),
('board','/bɔːd/','v','lên (tàu, máy bay)','to get on a ship, train or plane','["We board the plane at 6 a.m."]','{"board a plane","boarding pass"}','{"embark","get on"}','Travel','B1','lesson',2, current_date - 1, 0),
('cuisine','/kwɪˈziːn/','n','nền ẩm thực','a style of cooking','["Vietnamese cuisine is famous for its freshness."]','{"local cuisine","regional cuisine"}','{"cooking","cookery"}','Travel','B2','lesson',1, current_date, 0),
('off the beaten track','/ɒf ðə ˈbiːtn træk/','idiom','xa nơi đông người','far away from places people usually visit','["They prefer villages off the beaten track."]','{"get off the beaten track"}','{"remote","unspoilt"}','Travel','C1','lesson',0, current_date, 0),
('visa','/ˈviːzə/','n','thị thực','an official mark allowing entry to a country','["You need a visa to work there."]','{"apply for a visa","visa application"}','{"permit","entry clearance"}','Travel','B1','lesson',2, current_date - 3, 0),
-- HEALTH -------------------------------------------------------------
('recovery','/rɪˈkʌvəri/','n','sự phục hồi','the process of becoming healthy again','["He made a full recovery after surgery."]','{"make a recovery","speed up recovery"}','{"recuperation","healing"}','Health','B1','lesson',2, current_date - 1, 0),
('symptom','/ˈsɪmptəm/','n','triệu chứng','a sign of an illness','["Fever is a common symptom of flu."]','{"common symptom","show symptoms"}','{"sign","indication"}','Health','B2','lesson',2, current_date - 2, 0),
('prescription','/prɪˈskrɪpʃn/','n','đơn thuốc','a doctor''s written order for medicine','["You need a prescription for antibiotics."]','{"write a prescription","on prescription"}','{"medication order"}','Health','B2','lesson',1, current_date - 1, 0),
('prevention','/prɪˈvenʃn/','n','sự phòng ngừa','the act of stopping something bad from happening','["Prevention is better than cure."]','{"crime prevention","disease prevention"}','{"avoidance","precaution"}','Health','B2','lesson',3, current_date + 3, 0),
('immune','/ɪˈmjuːn/','adj','miễn dịch','protected from a disease or infection','["Vaccines keep your immune system strong."]','{"immune system","immune to something"}','{"resistant","protected"}','Health','B2','lesson',1, current_date - 2, 0),
('sedentary','/ˈsedntri/','adj','ít vận động','involving little exercise','["A sedentary lifestyle harms your heart."]','{"sedentary lifestyle","sedentary job"}','{"inactive","desk-bound"}','Health','C1','lesson',0, current_date, 0),
('chronic','/ˈkrɒnɪk/','adj','mãn tính','lasting for a long time','["Diabetes is a chronic condition."]','{"chronic illness","chronic pain"}','{"long-term","persistent"}','Health','C1','lesson',0, current_date, 0),
('therapy','/ˈθerəpi/','n','liệu pháp','treatment to heal the body or mind','["Physical therapy helped her walk again."]','{"physical therapy","undergo therapy"}','{"treatment","rehabilitation"}','Health','B2','lesson',2, current_date - 1, 1),
('wellbeing','/ˌwelˈbiːɪŋ/','n','sức khỏe tổng thể','a state of feeling healthy and happy','["Regular exercise improves wellbeing."]','{"mental wellbeing","sense of wellbeing"}','{"welfare","health"}','Health','B2','lesson',1, current_date, 0),
('diagnose','/ˈdaɪəɡnəʊz/','v','chẩn đoán','to identify an illness','["The doctor diagnosed him with asthma."]','{"diagnose with","early diagnosis"}','{"identify","detect"}','Health','B2','lesson',0, current_date, 0),
-- TECHNOLOGY ---------------------------------------------------------
('algorithm','/ˈælɡərɪðəm/','n','thuật toán','a set of rules a computer follows','["The algorithm ranks the search results."]','{"sorting algorithm","algorithm decides"}','{"procedure","process"}','Technology','B2','lesson',2, current_date - 1, 0),
('artificial intelligence','/ˌɑːtɪfɪʃl ɪnˈtelɪdʒəns/','n','trí tuệ nhân tạo','computer systems that perform tasks needing human intelligence','["Artificial intelligence is changing education."]','{"AI-powered","advance in artificial intelligence"}','{"machine intelligence"}','Technology','B1','lesson',1, current_date - 1, 0),
('browse','/braʊz/','v','duyệt web','to look through information on the internet','["Students browse the web for sources."]','{"browse the internet","browse online"}','{"surf","scroll through"}','Technology','B1','lesson',2, current_date - 2, 0),
('device','/dɪˈvaɪs/','n','thiết bị','a machine or piece of equipment','["Learning on a mobile device is convenient."]','{"mobile device","electronic device"}','{"gadget","appliance"}','Technology','B1','lesson',3, current_date + 6, 0),
('cybersecurity','/ˈsaɪbəsɪkjʊərəti/','n','an ninh mạng','protection of systems against digital attacks','["Cybersecurity training is now compulsory."]','{"cybersecurity threat","boost cybersecurity"}','{"IT security"}','Technology','C1','lesson',0, current_date, 0),
('obsolete','/ˈɒbsəliːt/','adj','lỗi thời','no longer used because something newer exists','["Fax machines are nearly obsolete."]','{"become obsolete","render something obsolete"}','{"outdated","antiquated"}','Technology','C1','lesson',1, current_date - 2, 0),
('innovative','/ˈɪnəvətɪv/','adj','sáng tạo','introducing new ideas or methods','["An innovative app can boost motivation."]','{"innovative approach","innovative solution"}','{"creative","original"}','Technology','B2','lesson',2, current_date - 1, 0),
('data privacy','/ˈdeɪtə ˈprɪvəsi/','n','quyền riêng tư dữ liệu','the right to keep personal information safe','["Users care deeply about data privacy."]','{"data privacy laws","protect data privacy"}','{"information privacy"}','Technology','B2','lesson',0, current_date, 0),
('automate','/ˈɔːtəmeɪt/','v','tự động hoá','to make a process work without human control','["Factories automate repetitive tasks."]','{"automate a process","fully automated"}','{"mechanise","computerise"}','Technology','B2','lesson',1, current_date, 0),
('digital footprint','/ˈdɪdʒɪtl ˈfʊtprɪnt/','n','dấu vết số','the information about you on the internet','["Think twice about your digital footprint."]','{"leave a digital footprint","reduce your digital footprint"}','{"online presence"}','Technology','C1','lesson',0, current_date, 0),
-- ENVIRONMENT --------------------------------------------------------
('sustainable','/səˈsteɪnəbl/','adj','bền vững','causing little harm to the environment and able to continue','["Cities need sustainable transport."]','{"sustainable development","sustainable growth"}','{"eco-friendly","green"}','Environment','B2','lesson',2, current_date - 1, 0),
('emission','/ɪˈmɪʃn/','n','khí thải','gases sent into the air','["Carbon emissions must fall by 2030."]','{"carbon emissions","cut emissions"}','{"discharge","output"}','Environment','B2','lesson',2, current_date - 2, 0),
('renewable','/rɪˈnjuːəbl/','adj','tái tạo được','(of energy) from sources that never run out','["Solar power is renewable."]','{"renewable energy","renewable sources"}','{"sustainable","unlimited"}','Environment','B2','lesson',1, current_date - 1, 0),
('drought','/draʊt/','n','hạn hán','a long period without rain','["The drought destroyed the harvest."]','{"severe drought","during a drought"}','{"dry spell","water shortage"}','Environment','B2','lesson',2, current_date - 1, 0),
('extinct','/ɪkˈstɪŋkt/','adj','tuyệt chủng','no longer existing','["Dinosaurs have been extinct for millions of years."]','{"become extinct","extinct species"}','{"vanished","died out"}','Environment','B1','lesson',1, current_date - 2, 0),
('pollution','/pəˈluːʃn/','n','ô nhiễm','dirty air, water or land caused by waste','["Air pollution harms children''s health."]','{"air pollution","reduce pollution"}','{"contamination","dirt"}','Environment','B1','lesson',3, current_date + 2, 0),
('conservation','/ˌkɒnsəˈveɪʃn/','n','sự bảo tồn','the protection of nature','["Forest conservation needs funding."]','{"wildlife conservation","conservation area"}','{"preservation","protection"}','Environment','B2','lesson',0, current_date, 0),
('landfill','/ˈlændfɪl/','n','bãi rác','a place where rubbish is buried','["Most plastic ends up in landfill."]','{"landfill site","bury waste in landfill"}','{"dump","rubbish tip"}','Environment','B2','lesson',0, current_date, 0),
('ecosystem','/ˈiːkəʊsɪstəm/','n','hệ sinh thái','all living things in an area and their environment','["Coral reefs are fragile ecosystems."]','{"fragile ecosystem","ecosystem services"}','{"habitat","biosphere"}','Environment','B2','lesson',1, current_date, 0),
('degradable','/dɪˈɡreɪdəbl/','adj','phân huỷ được','able to be broken down naturally','["Choose biodegradable packaging."]','{"biodegradable packaging","fully degradable"}','{"biodegradable","compostable"}','Environment','C1','lesson',0, current_date, 0),
-- FAMILY & PEOPLE ----------------------------------------------------
('upbringing','/ˈʌpbrɪŋɪŋ/','n','sự nuôi dạy','the way a child is raised','["Her strict upbringing shaped her discipline."]','{"strict upbringing","happy upbringing"}','{"nurturing","rearing"}','Family','B2','lesson',2, current_date - 1, 0),
('generation gap','/ˌdʒenəˈreɪʃn ɡæp/','n','khoảng cách thế hệ','differences in views between generations','["Technology widens the generation gap."]','{"bridge the generation gap"}','{"generational divide"}','Family','B2','lesson',1, current_date - 1, 0),
('adolescent','/ˌædəˈlesnt/','n','thiếu niên','a young person aged about 12–18','["Adolescents need more sleep than adults."]','{"adolescent behaviour","adolescent years"}','{"teenager","youth"}','Family','B2','lesson',2, current_date - 2, 0),
('household','/ˈhaʊshəʊld/','n','hộ gia đình','all the people living in one home','["Average household size is falling."]','{"household chores","household income"}','{"family unit","home"}','Family','B1','lesson',1, current_date - 2, 0),
('sibling','/ˈsɪblɪŋ/','n','anh chị em ruột','a brother or sister','["Older siblings often help with homework."]','{"younger sibling","sibling rivalry"}','{"brother or sister"}','Family','B2','lesson',2, current_date - 1, 0),
('relative','/ˈrelətɪv/','n','họ hàng','a member of your family','["We visit relatives every Tết."]','{"close relative","distant relative"}','{"relation","family member"}','Family','B1','lesson',3, current_date + 4, 0),
('nurture','/ˈnɜːtʃə(r)/','v','nuôi dưỡng','to care for and help develop','["Parents nurture talent through encouragement."]','{"nurture talent","nature versus nurture"}','{"foster","cultivate"}','Family','C1','lesson',0, current_date, 0),
('bond','/bɒnd/','n','mối quan hệ','a strong connection between people','["Family bonds strengthen over shared meals."]','{"family bond","strengthen the bond"}','{"tie","connection"}','Family','B2','lesson',1, current_date, 0),
('elderly','/ˈeldəli/','adj','cao tuổi','old or ageing','["The elderly deserve respectful care."]','{"elderly people","care for the elderly"}','{"old-aged","senior"}','Family','B1','lesson',0, current_date, 0),
('role model','/ˈrəʊl mɒdl/','n','hình mẫu','a person others try to copy','["Teachers are powerful role models."]','{"positive role model","look up to a role model"}','{"example","idol"}','Family','B1','lesson',2, current_date - 1, 0),
-- MONEY --------------------------------------------------------------
('budget','/ˈbʌdʒɪt/','n','ngân sách','a plan for spending money','["Students should keep a monthly budget."]','{"tight budget","on a budget"}','{"financial plan","allowance"}','Money','B1','lesson',2, current_date - 1, 0),
('expense','/ɪkˈspens/','n','chi phí','money spent on something','["Housing is the biggest expense."]','{"living expenses","cover the expenses"}','{"cost","outgoing"}','Money','B1','lesson',2, current_date - 2, 0),
('investment','/ɪnˈvestmənt/','n','khoản đầu tư','money put into something to gain profit','["Education is the best investment."]','{"make an investment","investment in something"}','{"stake","capital"}','Money','B2','lesson',1, current_date - 1, 0),
('debt','/det/','n','khoản nợ','money you owe','["Many graduates leave university in debt."]','{"in debt","pay off a debt"}','{"liability","arrears"}','Money','B2','lesson',2, current_date - 1, 0),
('income','/ˈɪnkʌm/','n','thu nhập','money received from work or business','["Average incomes have not kept up with rents."]','{"monthly income","household income"}','{"earnings","salary"}','Money','B1','lesson',3, current_date + 5, 0),
('thrift','/θrɪft/','n','sự tiết kiệm','careful use of money','["Thrift helped them survive hard times."]','{"thrift store","value thrift"}','{"frugality","saving"}','Money','C1','lesson',0, current_date, 0),
('afford','/əˈfɔːd/','v','đủ tiền làm gì','to have enough money for something','["Not everyone can afford private tuition."]','{"can afford","afford to do something"}','{"manage","be able to pay"}','Money','B1','lesson',1, current_date - 2, 0),
('frugal','/ˈfruːɡl/','adj','tiết kiệm','careful with money and not wasteful','["Frugal habits build long-term wealth."]','{"frugal lifestyle","frugal with money"}','{"thrifty","economical"}','Money','C1','lesson',0, current_date, 0),
('inflation','/ɪnˈfleɪʃn/','n','lạm phát','a rise in prices over time','["Inflation erodes savings."]','{"control inflation","inflation rate"}','{"price rise"}','Money','B2','lesson',1, current_date, 0),
('withdraw','/wɪðˈdrɔː/','v','rút tiền','to take money out of a bank account','["You can withdraw cash at any ATM."]','{"withdraw money","withdraw cash"}','{"take out"}','Money','B1','lesson',2, current_date - 3, 0),
-- FOOD ---------------------------------------------------------------
('nutrition','/njuˈtrɪʃn/','n','dinh dưỡng','food needed for health and growth','["Good nutrition improves concentration."]','{"good nutrition","nutrition facts"}','{"nourishment","diet"}','Food','B2','lesson',2, current_date - 1, 0),
('ingredient','/ɪnˈɡriːdiənt/','n','nguyên liệu','one of the foods used in a dish','["Fresh ingredients make better phở."]','{"fresh ingredients","list of ingredients"}','{"component","element"}','Food','B1','lesson',2, current_date - 2, 0),
('recipe','/ˈresəpi/','n','công thức nấu ăn','instructions for cooking a dish','["She shared her family recipe online."]','{"follow a recipe","family recipe"}','{"cookery instructions"}','Food','B1','lesson',0, current_date, 0),
('dietary','/ˈdaɪətəri/','adj','thuộc chế độ ăn','related to diet','["Dietary habits form early in life."]','{"dietary habits","dietary requirements"}','{"nutritional"}','Food','B2','lesson',1, current_date - 1, 0),
('homegrown','/ˌhəʊmˈɡrəʊn/','adj','trồng tại nhà','grown in your own garden or country','["Homegrown vegetables taste better."]','{"homegrown produce","homegrown food"}','{"local","home-produced"}','Food','B2','lesson',0, current_date, 0),
('processed','/ˈprəʊsest/','adj','đã qua chế biến','changed from its natural state by industry','["Processed food often contains too much salt."]','{"processed food","highly processed"}','{"refined","manufactured"}','Food','B2','lesson',1, current_date - 2, 0),
('portion','/ˈpɔːʃn/','n','khẩu phần','an amount of food for one person','["Restaurant portions are too large."]','{"portion size","generous portion"}','{"serving","helping"}','Food','B1','lesson',2, current_date - 1, 0),
('flavour','/ˈfleɪvə(r)/','n','hương vị','how food tastes','["Lime adds a fresh flavour."]','{"rich flavour","flavour of something"}','{"taste","savour"}','Food','B1','lesson',3, current_date + 3, 0),
('vegetarian','/ˌvedʒəˈteəriən/','n/adj','người ăn chay','a person who does not eat meat','["The canteen offers vegetarian options."]','{"vegetarian diet","vegetarian option"}','{"vegan","plant-based"}','Food','B1','lesson',1, current_date - 1, 0),
('indulge','/ɪnˈdʌldʒ/','v','thưởng thức quá mức','to allow yourself too much of something enjoyable','["It is fine to indulge occasionally."]','{"indulge in","indulge yourself"}','{"overdo","treat yourself"}','Food','C1','lesson',0, current_date, 0),
-- MEDIA & SOCIETY ----------------------------------------------------
('bias','/ˈbaɪəs/','n','thiên kiến','an unfair preference for or against something','["Reporters must avoid bias."]','{"media bias","gender bias"}','{"prejudice","partiality"}','Media','C1','lesson',2, current_date - 1, 0),
('coverage','/ˈkʌvərɪdʒ/','n','phạm vi đưa tin','the reporting of news events','["Live coverage reached millions."]','{"media coverage","live coverage"}','{"reporting","broadcasting"}','Media','B2','lesson',1, current_date - 1, 0),
('influence','/ˈɪnfluəns/','n/v','ảnh hưởng','the power to change how people think','["Influencers shape young consumers."]','{"under the influence","influence on"}','{"impact","sway"}','Media','B1','lesson',2, current_date - 2, 0),
('credible','/ˈkredəbl/','adj','đáng tin','able to be believed or trusted','["Always check whether a source is credible."]','{"credible source","credible evidence"}','{"trustworthy","reliable"}','Media','B2','lesson',2, current_date - 1, 0),
('rumour','/ˈruːmə(r)/','n','tin đồn','unofficial information that may be false','["Rumours spread fast on social media."]','{"spread a rumour","rumour has it"}','{"gossip","hearsay"}','Media','B2','lesson',1, current_date - 2, 0),
('censorship','/ˈsensəʃɪp/','n','sự kiểm duyệt','banning or cutting parts of media content','["Censorship limits artistic freedom."]','{"media censorship","impose censorship"}','{"restriction","suppression"}','Media','C1','lesson',0, current_date, 0),
('trend','/trend/','n','xu hướng','a general change in behaviour or fashion','["Short video is a lasting trend."]','{"follow a trend","set a trend"}','{"fashion","tendency"}','Media','B1','lesson',3, current_date + 2, 0),
('broadcast','/ˈbrɔːdkɑːst/','v/n','phát sóng','to send out radio or TV programmes','["The match is broadcast live."]','{"broadcast live","radio broadcast"}','{"air","transmit"}','Media','B2','lesson',1, current_date, 0),
('headline','/ˈhedlaɪn/','n','tiêu đề chính','the main title in a newspaper','["Sensational headlines attract clicks."]','{"make headlines","sensational headline"}','{"title","banner"}','Media','B1','lesson',2, current_date - 1, 0),
('viral','/ˈvaɪrəl/','adj','lan truyền mạnh','spreading quickly on the internet','["Her video went viral overnight."]','{"go viral","viral post"}','{"trending","widespread"}','Media','B1','lesson',2, current_date - 3, 0);

-- 3) Đi đúng đường production: trigger đã tạo state New cho mọi thẻ;
--    xoá rồi gọi fsrs_bootstrap() để quy đổi stage/next_review thật.
delete from card_states;
select fsrs_bootstrap();

-- Vài dòng daily_sessions cho màn lịch sử
insert into daily_sessions (session_date, topic, grammar_point, new_words, review_words) values
  (current_date - 2, 'Work', 'Present perfect', '["deadline","colleague"]', '[]'),
  (current_date - 1, 'Environment', 'Conditionals', '["sustainable","emission"]', '["deadline"]');
