# Design the Future
Design the Future: Regional distribution of R&amp;D in the UK

The algorithm to accompany the interactive tool for exploring options for allocating R&D investment within the UK.

The tool is open source and is live in two locations,

1/ https://www.nesta.org.uk/data-visualisation-and-interactive/design-future/

2/ https://odileeds.org/projects/designthefuture/


## Earlier work identifying sources.


### Data to collect
Data from different sources will frequently overlap. There is value in seeing whether we can get the same answers depending on which we use. We should be able to get close.

An inspiration of what we want to build is [OpenFisca](https://github.com/openfisca).

### R&D investment
* UK data on R&D spending [(GERDS)](https://www.ons.gov.uk/economy/governmentpublicsectorandtaxes/researchanddevelopmentexpenditure/datasets/ukgrossdomesticexpenditureonresearchanddevelopmentregionaltables).
* Eurostat data on R&D spending (how can this be more detailed than UK data if it comes from the same place?) (eurostat rd_e_gerdreg).
* Eurostat data on [personnel in R&D](https://www.gov.uk/government/statistics/public-expenditure-statistical-analyses-2018).
* UK open data on [R&D tax credit claimants](https://www.gov.uk/government/statistics/corporate-tax-research-and-development-tax-credit) (we need to look into how well assigned this is and avoid head office effects).
* What about data in PESA on economic affairs? For example government assistance to Nissan in Sunderland and banks in 2009 is not R&D, but may be relevant (or may not). [PESA tables are here](https://www.gov.uk/government/collections/public-expenditure-statistical-analyses-pesa).

### Capacity for expansions
* UK house prices. [ONS](https://www.ons.gov.uk/peoplepopulationandcommunity/housing/bulletins/housepricestatisticsforsmallareas/yearendingmarch2018).
* UK business rents [rentable values is available via the VOA](https://voaratinglists.blob.core.windows.net/html/rlidata.htm).
* Density of graduates. (skills measure).
* Labour costs. (there is data on this).
* Current GVA (or some productivity measure).
* UK housing completions. (these are published).
* Unemployment?

### Scientific output
* REF scores. (https://github.com/oscci/REFvsWellcome)
* Some bibliometrics. (The Metric Tide by James Wilson is a good way).
* [HE-BCI Survey](https://re.ukri.org/knowledge-exchange/the-he-bci-survey/).
* Patent by region data. (UK patent data, EU patent data). We have this via Microsoft Academic Knowledge, but can also get it via [PATSTAT](https://www.epo.org/searching-for-patents/business/patstat.html#tab-1) if we need.

### Funding
* Open data from [GrantNav](https://grantnav.threesixtygiving.org/) and [Gateway to Research](https://gtr.ukri.org/).
* EU open data on [FP7](http://data.europa.eu/euodp/data/dataset/cordisfp7projects).

### Decent tests of whether we’re on track.
Within this project there are a number of tests that we can use to see whether we are on track. For example, our data should be able to,
* Reproduce the AMRC claim that it has the highest engineering funding stream of anywhere in the UK? How?
