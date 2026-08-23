/* ============================================================================
   Block 07 data — legacy/index.html 3212-3569, lifted with types added.

   Split out for the same reason Congress.data.ts is: it is ~350 lines of
   literal content with no behaviour, and keeping it beside the component makes
   both readable. The values, wording, ordering and colours are unchanged.

   x() and rd() are the legacy positional constructors. They are verbose on
   purpose — rewriting the 60+ call sites into object literals would be a large
   diff with no behavioural gain and plenty of room to transpose an argument.
   ========================================================================= */

export type Media = { cap: string; sub: string }
export type XPost = {
  name: string; handle: string; v: number; av: string; time: string; text: string
  r: number; rt: number; l: number; vw: number; media: Media | null
  /* assigned by normalize() */
  _m?: number; _id?: string; _fresh?: boolean
}
export type RdComment = { a: string; t: string }
export type RdPost = {
  sub: string; c: string; title: string; author: string; time: string; body: string
  score: number; comments: number; flair: string; top: RdComment[]
  _m?: number; _id?: string
}
export type Ai = {
  score: number; label: string; dist: { bull: number; neu: number; bear: number }
  confidence: string; postCount: number; interp: string; synth: string
  reasons: string[]; bull: string[]; bear: string[]; momentum: string[]
}
export type Dataset = {
  display: string; short?: string; terms: string[]
  posts: XPost[]; reddit: RdPost[]; ai: Ai
  /* assigned by normalize() */
  _new?: RdPost[]; _hot?: RdPost[]; _top?: RdPost[]; _arrivals?: XPost[]; _ai?: number
}

export const AV = ['#F5B8A0','#A8C6E8','#C9B6E4','#9FD8C0','#F2D08A','#E8A8C0','#B7C9A8','#D8C1A0'];

export function x(
  name: string, handle: string, v: number, av: string, time: string, text: string,
  r: number, rt: number, l: number, vw: number, media?: Media,
): XPost {
  return {name:name,handle:handle,v:v,av:av,time:time,text:text,r:r,rt:rt,l:l,vw:vw,media:media||null};
}
export function rd(
  sub: string, c: string, title: string, author: string, time: string, body: string,
  score: number, comments: number, flair: string, top?: RdComment[],
): RdPost {
  return {sub:sub,c:c,title:title,author:author,time:time,body:body,score:score,
          comments:comments,flair:flair,top:top||[]};
}

export const DATA: Record<string, Dataset> = {

  nvda:{
    display:'$NVDA', terms:['$NVDA','NVDA','Nvidia'],
    posts:[
      x('Marisol Devane','mdevane_research',1,AV[1],'12m','Nvidia data centre revenue is now bigger than the entire company was two years ago. That is the part people keep skipping past.',84,412,2960,187000),
      x('Halcyon Charts','halcyoncharts',0,AV[3],'26m','$NVDA holding above the 50 day for the fourth session. Volume is lighter than the last three tests, which usually means fewer hands left to shake out.',61,288,1740,96400,{cap:'NVDA daily, 50 day retest',sub:'4 sessions above'}),
      x('Priya Raghunathan','praghu',1,AV[2],'48m','Read the supplier commentary before the earnings call, not after. Nvidia guidance rarely surprises anyone who tracked the memory and packaging orders in the prior quarter.',122,507,3410,241000),
      x('Deshaun Whitlow','dwhitlow',0,AV[6],'1h','Everyone arguing about NVDA valuation is using a multiple on numbers that changed twice since they built the model.',44,196,1280,73200),
      x('Anneke Vorster','anneke_v',1,AV[0],'2h','The bear case on $NVDA was never that demand disappears. It is that the customers building the demand start designing their own silicon. Watch the hyperscaler capex splits.',203,881,5620,398000),
      x('Terminal Velocity','tvel_macro',0,AV[5],'3h','Nvidia options flow into the print is unusually two sided this quarter. Skew is flat where it is normally screaming.',37,164,942,58900)
    ],
    reddit:[
      rd('r/stocks','#FF5A1F','NVDA at these levels: what does the market actually have to believe for this to work?','u/quiet_compounding','41m','Not asking whether it is a good company. Asking what growth rate you have to underwrite for the current price to make sense over five years, and whether anyone here has actually written that number down.',3140,486,'Discussion',[
        {a:'u/margin_of_safety_88',t:'I have it at roughly 28 percent revenue CAGR for three years then a hard step down. It works, but there is no room for a bad quarter anywhere in it.'},
        {a:'u/tempered_bull',t:'The number nobody writes down is the gross margin. That is the one that breaks first if competition shows up.'}
      ]),
      rd('r/investing','#7A9BFF','Nvidia is now a larger index weight than most people realise. Is your portfolio more concentrated than you think?','u/index_plumbing','2h','Ran the look through on three popular ETFs I hold. Combined single name exposure to NVDA came out far higher than I expected. Sharing the method so people can check their own.',2260,318,'Analysis',[
        {a:'u/three_fund_forever',t:'Did this last month and found the same. Owning four funds does not mean owning four different things.'},
        {a:'u/kelly_criterion_fan',t:'This is the most useful post on this sub in weeks. The look through is the whole exercise.'}
      ]),
      rd('r/wallstreetbets','#FF5A1F','Held NVDA through three drawdowns and learned exactly one thing','u/regarded_but_patient','5h','The lesson was not conviction. It was position sizing. I only survived the drawdowns because the position was small enough that I could ignore it.',7820,1140,'Gain',[
        {a:'u/theta_gang_survivor',t:'Position sizing is the only edge most of us actually have access to.'},
        {a:'u/exit_liquidity_pro',t:'Nobody upvotes the sizing posts until after the drawdown.'}
      ]),
      rd('r/hardware','#9FD8C0','Breaking down where the packaging bottleneck actually sits in the Nvidia supply chain','u/fab_notes','8h','Worked adjacent to this for six years. The constraint people call a GPU shortage has usually been an advanced packaging and memory constraint, and those two scale on different timelines.',1490,204,'Technical',[
        {a:'u/lithography_nerd',t:'Correct, and capacity additions there are announced years before they are usable.'}
      ])
    ],
    ai:{
      score:71, label:'Bullish', dist:{bull:58,neu:27,bear:15}, confidence:'High', postCount:4820,
      interp:'Conversation is leaning bullish, but the bullish half is arguing about magnitude rather than direction. The bearish half has moved off valuation and onto customer concentration, which is a more specific concern than the one it replaced.',
      synth:'Sentiment is strong without being euphoric. The signal worth watching is that the bear argument changed shape this week, from price to customers designing their own chips.',
      reasons:['Supply chain commentary cited as leading indicator','Index concentration threads rising','Options skew unusually flat'],
      bull:['Data centre revenue growth','Supplier orders tracking ahead'],
      bear:['Hyperscaler in-house silicon','Gross margin durability'],
      momentum:['Bullish share up from 51 percent last week']
    }
  },

  tsla:{
    display:'$TSLA', terms:['$TSLA','TSLA','Tesla'],
    posts:[
      x('Corinne Baptiste','cbaptiste',1,AV[0],'9m','Tesla margin per vehicle and Tesla energy storage deployments are now telling two completely different stories. Most takes only read one of them.',96,344,2180,142000),
      x('Grid & Gears','gridgears',0,AV[4],'31m','$TSLA storage backlog is the least discussed line in the entire filing and it compounds faster than the auto business.',58,271,1620,88300,{cap:'Storage deployed, trailing 8 quarters',sub:'GWh, quarterly'}),
      x('Idris Kalu','idriskalu',1,AV[6],'1h','Reminder that Tesla delivery numbers move the stock for about two days and the margin line moves it for two quarters.',77,398,2440,167000),
      x('Nadine Oyelaran','nadine_o',0,AV[7],'2h','The Tesla bull and bear cases have been arguing past each other for years because one is pricing a car company and the other is pricing an energy and software company.',134,612,3890,276000),
      x('Sable Quant','sablequant',1,AV[2],'4h','$TSLA realised volatility has been below implied for six straight weeks. That gap usually closes on an event, not on a drift.',29,142,806,49700)
    ],
    reddit:[
      rd('r/investing','#7A9BFF','Tesla energy is doing something the auto segment is not, and the coverage barely mentions it','u/two_businesses','1h','Pulled ten quarters of segment data into a sheet. The growth rates diverge sharply and the margin profile is not the same shape either. Method and sources in the comments.',2740,392,'Analysis',[
        {a:'u/segment_reporter',t:'Been saying this for a year. The market prices the deliveries headline because it comes out first.'},
        {a:'u/slow_capital',t:'Would like to see this normalised for the credits before drawing conclusions.'}
      ]),
      rd('r/stocks','#FF5A1F','What would actually change your mind on TSLA, in either direction?','u/falsifiable_thesis','3h','Genuine question. Most threads here are position statements. I want to read the specific number or event that would flip you, because if you cannot name one you do not have a thesis.',1920,517,'Discussion',[
        {a:'u/bear_with_receipts',t:'Two consecutive quarters of auto gross margin expansion without price cuts. That would flip me.'},
        {a:'u/long_and_bored',t:'Storage growth dropping below 30 percent year over year would end it for me.'}
      ]),
      rd('r/wallstreetbets','#FF5A1F','TSLA weeklies taught me that being right about the company and right about the timing are unrelated skills','u/premium_donor','6h','Thesis was fine. Expiry was not. Posting the loss so somebody else does not repeat it.',5410,883,'Loss',[
        {a:'u/gamma_scalper',t:'Time is the only thing options cannot forgive.'}
      ]),
      rd('r/electricvehicles','#9FD8C0','Service centre wait times as a leading indicator for Tesla demand','u/ev_owner_ten_years','9h','Crowd sourced wait time data across 40 metros for six months. It tracks against regional delivery numbers better than I expected.',1180,166,'Data',[
        {a:'u/charging_curve',t:'This is a genuinely creative dataset. Would love the raw file.'}
      ])
    ],
    ai:{
      score:48, label:'Mixed', dist:{bull:35,neu:31,bear:34}, confidence:'Medium', postCount:6310,
      interp:'Sentiment is close to evenly split, and the split is structural rather than emotional. Bulls and bears are largely valuing different segments of the same company.',
      synth:'A genuinely divided read. The most useful threads this week were the ones separating the auto business from energy storage, because the two are moving in opposite directions.',
      reasons:['Segment divergence dominating discussion','Delivery headline treated as short lived','Realised volatility below implied'],
      bull:['Storage backlog growth','Software attach rate'],
      bear:['Auto gross margin without price cuts','Demand elasticity in key metros'],
      momentum:['Bearish share flat week over week']
    }
  },

  btc:{
    display:'$BTC', terms:['$BTC','BTC','Bitcoin'],
    posts:[
      x('Oduya Renfrew','oduya_r',1,AV[5],'7m','Bitcoin spot flows and Bitcoin funding rates have been disagreeing for nine days. One of them is early and one of them is wrong.',88,401,2620,178000),
      x('Chainmetrics','chainmetrics',1,AV[3],'22m','$BTC supply held for over a year hit another local high. Long term holders are not the ones selling into this.',103,478,3120,214000,{cap:'Supply last active 1y+',sub:'percent of circulating'}),
      x('Willa Nkemdirim','willank',0,AV[2],'55m','Every BTC cycle produces a new group of people who believe this cycle is structurally different, and they are right about a third of the time.',66,243,1710,97800),
      x('Lorcan Ferreira','lorcanf',1,AV[6],'2h','The ETF wrapper changed who owns Bitcoin far more than it changed what Bitcoin is. Ownership structure is the story, not the price print.',147,689,4210,312000),
      x('Basis Trade Bot','basistrade',0,AV[7],'5h','Perp funding on $BTC has been positive for eleven sessions. Crowded is not the same as wrong, but it is not free either.',31,158,884,53600)
    ],
    reddit:[
      rd('r/Bitcoin','#FF5A1F','Long term holder supply keeps climbing while price chops. What does that actually tell us?','u/utxo_watcher','38m','Charting coin age bands against price for the last three cycles. The pattern is not as clean as the popular version of it, and I want people to poke holes in the method.',4120,571,'On-chain',[
        {a:'u/coin_days_destroyed',t:'It tells you supply is tightening. It does not tell you when anyone will care.'},
        {a:'u/skeptical_hodler',t:'Appreciate that you posted the method instead of just the chart.'}
      ]),
      rd('r/CryptoCurrency','#7A9BFF','The ETF flows changed the buyer, and nobody has fully priced what that means for volatility','u/flow_of_funds','2h','Different holders behave differently in a drawdown. If the marginal buyer is now an allocator rebalancing quarterly, the shape of the next selloff should not look like the last one.',3380,624,'Discussion',[
        {a:'u/rebalance_quarterly',t:'This is the most underrated structural change of the last two years.'},
        {a:'u/volatility_is_a_tax',t:'Or volatility just moves to a different part of the curve.'}
      ]),
      rd('r/investing','#7A9BFF','How much Bitcoin belongs in a portfolio, and how did you arrive at the number?','u/allocation_question','7h','Looking for the reasoning, not the percentage. Anyone can say five percent. I want to know what framework produced it.',2010,447,'Portfolio',[
        {a:'u/risk_parity_lite',t:'I sized it at the point where a total loss would be annoying rather than damaging. That is the whole framework.'}
      ]),
      rd('r/CryptoMarkets','#9FD8C0','Funding rates have been positive for eleven sessions. Historical context inside.','u/funding_historian','11h','Pulled every stretch of eleven or more positive funding days since 2019 and charted what happened over the following month. Mixed, but the tails are worth seeing.',1560,238,'Data',[
        {a:'u/perp_degen',t:'The tails are the entire point of this chart and everyone will read the average instead.'}
      ])
    ],
    ai:{
      score:64, label:'Leaning bullish', dist:{bull:49,neu:30,bear:21}, confidence:'Medium', postCount:9140,
      interp:'Positioning talk is outweighing price talk, which tends to happen in the middle of a range rather than at an extreme. Holder behaviour is the most cited support, crowded funding is the most cited risk.',
      synth:'Constructive but not stretched. The strongest threads are about who owns the asset now rather than where it trades, which is a healthier conversation than the last two range breaks produced.',
      reasons:['Long term holder supply at local high','Funding positive eleven sessions','ETF ownership structure debate'],
      bull:['Tightening available supply','Allocator buyer base'],
      bear:['Crowded perp positioning','Flows and funding disagreeing'],
      momentum:['Neutral share rising as price chops']
    }
  },

  aapl:{
    display:'$AAPL', terms:['$AAPL','AAPL','Apple'],
    posts:[
      x('Fenella Adeyemi','fenella_a',1,AV[0],'14m','Apple services margin is doing quiet, boring, extremely durable work while everyone argues about hardware cycles.',72,301,1980,124000),
      x('Cupertino Notes','cupertinonotes',0,AV[1],'44m','$AAPL installed base keeps setting records. That is the number the whole services thesis rests on and it barely gets quoted.',49,218,1340,81200,{cap:'Active devices, trailing',sub:'billions'}),
      x('Rasheed Olatunji','rasheed_o',1,AV[6],'1h','The Apple bear case has been the same three sentences for a decade. At some point a thesis that never updates is not a thesis.',91,387,2510,163000),
      x('Vera Kaminski','verakam',0,AV[2],'3h','Replacement cycle length is the single most important Apple input and almost nobody models it explicitly.',55,229,1470,88600),
      x('Buyback Watch','buybackwatch',1,AV[4],'6h','$AAPL share count has fallen every year for over a decade. Per share numbers flatter the business, and that is a real return, but it is worth naming.',63,294,1830,109000)
    ],
    reddit:[
      rd('r/investing','#7A9BFF','Modelling the Apple replacement cycle properly changed my valuation by more than I expected','u/handset_modeler','52m','Most models assume a fixed cycle length. I made it a variable and ran three scenarios. Sharing the sheet structure because the sensitivity surprised me.',2890,411,'Analysis',[
        {a:'u/dcf_disrespecter',t:'The sensitivity is the whole model. Everything else is decoration.'},
        {a:'u/services_stan',t:'Would add that a longer cycle is not purely negative once services attach is high.'}
      ]),
      rd('r/stocks','#FF5A1F','At what point does Apple stop being a growth story and start being a cash return story?','u/framing_question','3h','Genuine framing question. The buyback has done a lot of the per share work. That is fine, but it changes what you are actually buying.',2140,388,'Discussion',[
        {a:'u/total_yield',t:'It already is one for most holders and they have not noticed.'},
        {a:'u/compounder_hunter',t:'Both can be true. Services is still growing at a rate most companies would take.'}
      ]),
      rd('r/apple','#9FD8C0','Installed base numbers, and why the figure is more useful than unit sales','u/ecosystem_math','8h','Unit sales tell you about one quarter. Installed base tells you about the next five years of services revenue. Here is the arithmetic.',1670,229,'Discussion',[
        {a:'u/long_time_lurker_99',t:'This reframing is genuinely useful, thanks for writing it out.'}
      ]),
      rd('r/SecurityAnalysis','#7A9BFF','Apple gross margin decomposition, hardware versus services, ten year view','u/margin_archaeology','1d','Rebuilt the split from filings rather than taking the reported segment margin at face value. Notes on where the assumptions get soft.',1290,147,'Deep dive',[
        {a:'u/footnote_reader',t:'The soft assumptions section is the best part of this post.'}
      ])
    ],
    ai:{
      score:59, label:'Leaning bullish', dist:{bull:44,neu:38,bear:18}, confidence:'High', postCount:3760,
      interp:'The conversation is unusually calm and unusually technical. Most of the disagreement is about which framework applies rather than whether the business is healthy.',
      synth:'Low heat, high quality. The recurring theme is that the replacement cycle and the installed base do more work in any honest model than the hardware headlines do.',
      reasons:['Replacement cycle modelling threads','Installed base cited as core input','Buyback effect on per share figures'],
      bull:['Services margin durability','Installed base at record'],
      bear:['Growth story reframing','Hardware cycle lengthening'],
      momentum:['Neutral share highest of the seven tracked names']
    }
  },

  spy:{
    display:'$SPY', terms:['$SPY','SPY','S&P 500','index'],
    posts:[
      x('Imani Broadus','imanibroadus',1,AV[3],'11m','Index breadth has been narrowing for five weeks while the headline number holds. Those two facts are not in conflict, they are just uncomfortable together.',94,428,2740,192000),
      x('Breadth Desk','breadthdesk',0,AV[5],'29m','$SPY equal weight versus cap weight is back at the widest gap of the year.',52,247,1490,86700,{cap:'Equal weight vs cap weight',sub:'ratio, year to date'}),
      x('Soren Halvorsen','sorenh',1,AV[1],'1h','Every index conversation should start by naming the top ten weights out loud. It changes how the word diversified sounds.',118,531,3260,238000),
      x('Margot Ibekwe','margot_i',0,AV[7],'4h','The S&P 500 is a momentum strategy with a marketing department. That is not a criticism, it is just what a cap weighted index does.',176,802,4980,364000),
      x('Vol Surface','volsurface_',1,AV[2],'7h','$SPY term structure has flattened into the event window. Not inverted, just flat, which is its own kind of message.',34,171,912,57300)
    ],
    reddit:[
      rd('r/investing','#7A9BFF','Narrowing breadth: how worried should a long term index holder actually be?','u/steady_dca','1h','Every cycle produces breadth panic threads. I went and looked at what narrow breadth actually preceded historically and the answer is less clean than either camp claims.',3620,502,'Analysis',[
        {a:'u/vanguard_and_chill',t:'The honest answer is that it matters for two year returns and not for twenty year returns.'},
        {a:'u/breadth_bear',t:'Historically it has resolved by the laggards catching up as often as by the leaders falling.'}
      ]),
      rd('r/Bogleheads','#9FD8C0','Equal weight versus cap weight, and why the answer is not obvious','u/costs_matter','4h','Ran both over multiple decades including the fee drag and the tax drag. Neither wins cleanly and the reason why is more interesting than the result.',2450,336,'Discussion',[
        {a:'u/three_fund_forever',t:'The fee and tax drag section is the part most comparisons skip.'},
        {a:'u/rebalance_quarterly',t:'Equal weight is a small and value tilt wearing a costume.'}
      ]),
      rd('r/stocks','#FF5A1F','Name the top ten index weights from memory. Most people cannot, and that is the point.','u/concentration_check','6h','Informal experiment in my investing club. Almost nobody got past six. We all thought we knew what we owned.',1980,414,'Discussion',[
        {a:'u/index_plumbing',t:'Did this with my own portfolio look through last month and had the same result.'}
      ]),
      rd('r/financialindependence','#7A9BFF','Does narrowing breadth change anything about a 25 year accumulation plan?','u/coast_fi_2041','12h','Serious question rather than a bait post. My plan does not have a lever for this, so I am trying to work out whether it should.',1420,271,'Planning',[
        {a:'u/time_in_market',t:'If your plan has no lever for it, the answer is usually that it does not need one.'}
      ])
    ],
    ai:{
      score:52, label:'Mixed', dist:{bull:36,neu:40,bear:24}, confidence:'Medium', postCount:5280,
      interp:'Neutral commentary is the largest share, which is unusual. Most posts are describing market structure rather than taking a directional position on it.',
      synth:'A structure conversation more than a direction conversation. Breadth and index concentration are doing almost all the talking this week.',
      reasons:['Breadth narrowing five weeks','Equal weight gap at year wide','Term structure flat into event'],
      bull:['Laggards catching up historically','Long horizon insensitivity'],
      bear:['Concentration in top weights','Narrow participation'],
      momentum:['Neutral share up from 31 percent']
    }
  },

  rates:{
    display:'Interest rates', short:'rates', terms:['rates','rate','Fed','FOMC','cut','cuts','yield','yields'],
    posts:[
      x('Delphine Marchetti','delphinem',1,AV[0],'8m','The market has priced three different rate paths in five weeks. None of the underlying data moved enough to justify that.',108,461,2890,204000),
      x('Curve Watch','curvewatch',0,AV[4],'27m','Two year yield doing more work than any Fed speaker this month.',47,209,1260,74800,{cap:'2y yield, 60 sessions',sub:'basis points'}),
      x('Kwabena Asante','kasante',1,AV[6],'1h','Rate cuts are not a stimulus event, they are a signal about what the people with the data are seeing. Those two readings lead to opposite trades.',156,703,4340,318000),
      x('Ilse Vandermeer','ilse_v',0,AV[2],'3h','Every time the Fed does exactly what was priced, half the timeline calls it a surprise.',82,356,2190,148000),
      x('Front End Flow','frontendflow',1,AV[5],'6h','Positioning in the front end is the most one sided it has been this year. That is a fragility, not a forecast.',39,183,1040,63400)
    ],
    reddit:[
      rd('r/investing','#7A9BFF','What rate cuts actually do to your portfolio, mechanically, not vibes','u/duration_matters','1h','Trying to write the plain version. Duration, refinancing, discount rates, and the difference between an easing cycle that arrives early and one that arrives late.',3980,563,'Education',[
        {a:'u/bond_curious',t:'The early versus late distinction is the part that never makes it into headlines.'},
        {a:'u/dividend_growth_guy',t:'Would add that the refinancing channel shows up in earnings a lot later than people expect.'}
      ]),
      rd('r/economy','#9FD8C0','The market has repriced the rate path three times this quarter. Charted every reprice.','u/repricing_log','3h','Made a timeline of expectations against the data releases that moved them. The gap between how much expectations moved and how much data moved is the interesting part.',2570,391,'Data',[
        {a:'u/data_dependent',t:'This is exactly the chart I have wanted and could not find.'},
        {a:'u/macro_tourist_99',t:'Expectations move on tone as much as on data and this shows it well.'}
      ]),
      rd('r/personalfinance','#FF5A1F','Should a rate cut change what I do with my savings, or am I overthinking this?','u/hys_holder','5h','I have an emergency fund in a high yield account and no debt. Trying to work out whether any of this matters at my scale.',1840,462,'Advice',[
        {a:'u/boring_is_fine',t:'At your scale the answer is usually no. Keep the emergency fund liquid and ignore the noise.'}
      ]),
      rd('r/bonds','#7A9BFF','Front end positioning is the most one sided it has been all year','u/short_end_watcher','10h','Pulled the positioning data and charted it against the last four one sided episodes. Worth knowing what unwinds have looked like historically.',1210,178,'Positioning',[
        {a:'u/carry_trader',t:'One sided positioning is a fragility measure, not a direction call. Good post.'}
      ])
    ],
    ai:{
      score:43, label:'Cautious', dist:{bull:28,neu:36,bear:36}, confidence:'Medium', postCount:7490,
      interp:'The tone is cautious rather than bearish. Most of the concern is about how fast expectations are repricing, not about the level of rates itself.',
      synth:'Uncertainty is the dominant theme. The recurring point across the better threads is that expectations have moved far more than the underlying data has.',
      reasons:['Three repricings of the path this quarter','Front end positioning one sided','Two year yield leading commentary'],
      bull:['Easing cycle mechanics for duration','Refinancing channel over time'],
      bear:['Cuts read as a signal not a stimulus','Fragile one sided positioning'],
      momentum:['Bearish share up from 29 percent']
    }
  },

  ai:{
    display:'AI stocks', short:'AI names', terms:['AI','artificial intelligence','capex','inference','datacenter','data centre'],
    posts:[
      x('Yusra Benali','yusrab',1,AV[1],'6m','The AI trade has quietly split into three trades: silicon, power, and applications. They stopped moving together about two months ago.',131,589,3620,268000),
      x('Capex Tracker','capextracker',0,AV[3],'24m','Combined hyperscaler AI capex guidance is now larger than several national infrastructure budgets. Nobody has a good historical analogue for that.',87,412,2540,186000,{cap:'Hyperscaler capex guidance',sub:'combined, annualised'}),
      x('Tobias Lindqvist','tobiasl',1,AV[7],'1h','The interesting question is no longer who trains the best model. It is who can serve inference cheaply enough to give it away.',164,742,4610,342000),
      x('Aoife Donnelly','aoife_d',0,AV[0],'2h','Every AI thread eventually becomes a power grid thread and the people who realised that early have done well.',119,534,3280,241000),
      x('Margin Notes','marginnotes_',1,AV[6],'5h','Software companies adding AI features and software companies whose AI features change unit economics are not the same investment. The market keeps pricing them the same.',73,318,1970,132000)
    ],
    reddit:[
      rd('r/investing','#7A9BFF','The AI trade has split into three and most portfolios are only positioned for one','u/three_way_split','44m','Silicon, power and applications have different drivers, different cycle lengths and different failure modes. Grouping them as one theme is how people end up more concentrated than intended.',4310,608,'Analysis',[
        {a:'u/thematic_skeptic',t:'This is the clearest framing of the theme I have read. Power is the leg nobody sized properly.'},
        {a:'u/capex_watcher',t:'Would add a fourth leg for cooling and physical infrastructure.'}
      ]),
      rd('r/stocks','#FF5A1F','What happens to AI capex if inference costs keep falling this fast?','u/unit_economics_nerd','2h','Falling cost per token is good for adoption and ambiguous for the companies selling the compute. Trying to work out which effect dominates and on what timeline.',3120,529,'Discussion',[
        {a:'u/jevons_enjoyer',t:'Cheaper inference historically means more inference, not less spend. That is the whole bull case.'},
        {a:'u/show_me_the_revenue',t:'It only holds if the applications monetise. That is still the open question.'}
      ]),
      rd('r/energy','#9FD8C0','Data centre load growth versus grid interconnection queues, by region','u/grid_queue_data','6h','Interconnection timelines are the real constraint on data centre buildout in several regions and they are measured in years.',2280,314,'Infrastructure',[
        {a:'u/transmission_planner',t:'People model chip supply and forget that the substation is the long pole.'}
      ]),
      rd('r/MachineLearning','#7A9BFF','Inference cost per token, tracked across eighteen months of public pricing','u/token_economics','1d','Compiled every public price change I could find and normalised it. The curve is steeper than most commentary assumes.',1940,247,'Research',[
        {a:'u/serving_infra',t:'The normalisation notes matter here. Raw price comparisons across providers are close to meaningless.'}
      ])
    ],
    ai:{
      score:67, label:'Bullish', dist:{bull:54,neu:29,bear:17}, confidence:'Medium', postCount:11240,
      interp:'Bullish overall, but the conversation has become noticeably more specific. Posts are separating silicon, power and applications instead of treating the theme as one position.',
      synth:'The theme is maturing. The most engaged threads are about power constraints and inference economics rather than model capability, which is a different conversation than three months ago.',
      reasons:['Theme splitting into distinct legs','Grid interconnection cited as constraint','Inference cost curve steeper than assumed'],
      bull:['Cheaper inference driving volume','Capex guidance still rising'],
      bear:['Application monetisation unproven','Physical infrastructure timelines'],
      momentum:['Bullish share down slightly, specificity up']
    }
  }
};

export const ALIAS: Record<string, string> = {
  nvda:'nvda','$nvda':'nvda',nvidia:'nvda',
  tsla:'tsla','$tsla':'tsla',tesla:'tsla',
  btc:'btc','$btc':'btc',bitcoin:'btc',
  aapl:'aapl','$aapl':'aapl',apple:'aapl',
  spy:'spy','$spy':'spy','s&p':'spy','sp500':'spy','s&p 500':'spy',index:'spy',
  rates:'rates',rate:'rates',fed:'rates',fomc:'rates',yields:'rates','interest rates':'rates',
  ai:'ai','artificial intelligence':'ai','ai stocks':'ai',datacenter:'ai','data centre':'ai'
};

export const CHIPS: { label: string; q: string }[] = [
  {label:'$NVDA',q:'$NVDA'},{label:'$TSLA',q:'$TSLA'},{label:'$BTC',q:'$BTC'},
  {label:'$AAPL',q:'$AAPL'},{label:'$SPY',q:'$SPY'},{label:'rates',q:'rates'},{label:'AI',q:'AI'}
];

export function generic(raw: string): Dataset {
  const q = raw.trim();
  const disp = q.length<=5 && /^[a-z$]+$/i.test(q) ? q.toUpperCase() : q;
  const terms = [disp, q, q.replace(/^\$/,'')].filter(Boolean);
  return {
    display:disp, short:disp, terms:terms,
    posts:[
      x('Marisol Devane','mdevane_research',1,AV[1],'19m','Watching '+disp+' closely this week. The flow is thinner than the commentary suggests, which usually means the story is ahead of the positioning.',52,214,1380,84200),
      x('Halcyon Charts','halcyoncharts',0,AV[3],'37m',disp+' is at the level where the last two attempts stalled. Third tests behave differently to first ones.',34,147,902,56100,{cap:disp+' , recent range',sub:'third test of level'}),
      x('Priya Raghunathan','praghu',1,AV[2],'1h','The '+disp+' conversation is louder than the underlying data supports right now. That gap tends to close in one direction or the other quickly.',67,289,1740,102000),
      x('Deshaun Whitlow','dwhitlow',0,AV[6],'3h','Nobody posting about '+disp+' has stated what would change their mind, which tells you what kind of conversation this is.',41,178,1090,67400),
      x('Anneke Vorster','anneke_v',1,AV[0],'6h',disp+' is a good reminder that a crowded opinion and a crowded position are different things, and only one of them costs money.',73,312,1960,118000)
    ],
    reddit:[
      rd('r/investing','#7A9BFF','What is the actual thesis on '+disp+', in one paragraph?','u/falsifiable_thesis','58m','Looking for the argument rather than the conclusion. If you hold this, what has to be true, and what would tell you it is not?',1640,268,'Discussion',[
        {a:'u/margin_of_safety_88',t:'Writing the thesis in one paragraph is the fastest way to find out you do not have one.'},
        {a:'u/tempered_bull',t:'Mine fits in two sentences and I have been wrong about both before.'}
      ]),
      rd('r/stocks','#FF5A1F','Position sizing for '+disp+' when you are not sure yet','u/steady_dca','3h','Half the arguments here would disappear if people posted their position size alongside their opinion.',1180,197,'Discussion',[
        {a:'u/kelly_criterion_fan',t:'Size is the only part of the trade you fully control.'}
      ]),
      rd('r/wallstreetbets','#FF5A1F',disp+' and the eternal lesson about conviction versus timing','u/regarded_but_patient','7h','Right idea, wrong month, again. Posting it so the next person can skip a step.',2740,436,'Loss',[
        {a:'u/theta_gang_survivor',t:'Timing is the tuition everyone pays eventually.'}
      ]),
      rd('r/SecurityAnalysis','#7A9BFF','Building a base case for '+disp+' from primary sources only','u/footnote_reader','14h','Ignored every summary and worked from filings and transcripts. Notes on where the numbers stop being solid.',860,113,'Deep dive',[
        {a:'u/dcf_disrespecter',t:'Primary sources only is a good discipline and a slow one.'}
      ])
    ],
    ai:{
      score:50, label:'Mixed', dist:{bull:34,neu:36,bear:30}, confidence:'Low', postCount:410,
      interp:'Volume on '+disp+' is low, so this read is directional at best. What conversation exists is split and mostly framed as questions rather than positions.',
      synth:'Not enough discussion here to draw a firm conclusion. Treat this as a starting point rather than a signal, and check back when volume picks up.',
      reasons:['Low post volume','Questions outnumber positions'],
      bull:['Thin positioning relative to talk'],
      bear:['Story ahead of the data'],
      momentum:['Insufficient history']
    }
  };
}

export function RD_NEW(q: string): RdPost[] {
  return [
  rd('r/stocks','#FF5A1F','Just posted: fresh thread on '+q+' after the last hour of tape','u/tape_reader_live','3m','Starting a clean thread since the older one is unreadable now. Post what you are seeing, not what you think should happen.',18,7,'Live',[
    {a:'u/first_in_line',t:'Volume picked up around the half hour mark and has not faded yet.'}
  ]),
  rd('r/investing','#7A9BFF','Anyone else notice the '+q+' commentary shift in the last two days?','u/quiet_compounding','14m','The framing changed and I cannot tell yet whether that is signal or just the same people getting bored of the old argument.',46,19,'Discussion',[
    {a:'u/slow_capital',t:'Framing shifts usually lag the actual change by about a week.'}
  ]),
  rd('r/CryptoMarkets','#9FD8C0','New data drop relevant to '+q+', link and quick read inside','u/data_dependent','29m','Posting the source before the takes arrive. Draw your own conclusions first.',88,23,'Data',[])
  ]
}

export function RD_HOT(q: string): RdPost[] {
  return [
  rd('r/investing','#7A9BFF','The '+q+' thread that changed how I think about position sizing','u/kelly_criterion_fan','2h','Small post, big idea. Somebody here framed sizing as a survival question rather than a returns question and I have not stopped thinking about it.',1920,287,'Discussion',[
    {a:'u/margin_of_safety_88',t:'Survival first. Returns are what happens to the people still in the game.'}
  ]),
  rd('r/stocks','#FF5A1F','Rising fast: contrarian take on '+q+' with actual numbers attached','u/bear_with_receipts','4h','I disagree with most of this sub on this and I have put the working out below rather than just the conclusion.',1450,392,'Contrarian',[
    {a:'u/show_me_the_revenue',t:'Disagree with the conclusion, respect the fact that you showed the work.'}
  ])
  ]
}

export function RD_TOP(q: string): RdPost[] {
  return [
  rd('r/investing','#7A9BFF','[Top this month] A complete framework for evaluating '+q+' without the noise','u/framework_builder','6d','Long post. Six sections, sources at the bottom, and an explicit list of what would falsify each part of it.',18400,2140,'Guide',[
    {a:'u/footnote_reader',t:'The falsification list is what separates this from every other guide on here.'},
    {a:'u/three_fund_forever',t:'Saved. This is the reference version.'}
  ]),
  rd('r/stocks','#FF5A1F','[Top all time in this sub] What ten years of being wrong about '+q+' taught me','u/decade_of_lessons','2y','Not a victory lap. A list of the specific mistakes, in order, with what each one cost.',34700,4610,'Retrospective',[
    {a:'u/long_time_lurker_99',t:'Reread this every year. It gets more accurate every time.'}
  ])
  ]
}

export function ARRIVALS(q: string): XPost[] {
  return [
  x('Tape Reader','tape_reader_live',0,AV[4],'0m','New flow coming through on '+q+' in the last few minutes. Size is small but it is one directional.',3,11,64,2100),
  x('Imani Broadus','imanibroadus',1,AV[3],'0m','Updating my note on '+q+'. The thing I got wrong last week was the timeline, not the direction.',7,29,183,6400),
  x('Front End Flow','frontendflow',1,AV[5],'0m',q+' desk chatter picking up. Nothing confirmed, so treat it as chatter.',2,8,47,1800),
  x('Willa Nkemdirim','willank',0,AV[2],'0m','Worth saying plainly: most of the '+q+' takes in my timeline right now are the same take with different punctuation.',9,34,241,8700),
  x('Chainmetrics','chainmetrics',1,AV[1],'0m','Fresh print on '+q+'. Chart in the reply, method in the thread below that.',4,17,96,3300)
  ]
}
