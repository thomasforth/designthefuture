function bodyLoad() {
    checkForPresetDataType();
    registerChartPlugin();
    addResizeEvent();
    getData();
}

function checkForPresetDataType() {
    if (getQueryVariable("output")) {
        document.querySelector(".barchartSourceData button.active").classList.remove("active");
        document.querySelector(".barchartSourceData button[data-type='" + getQueryVariable("output") + "']").classList.add("active");
    }
}

function addResizeEvent() {
    window.addEventListener("resize", function () {
        if (barchartField1 && barchartField2) {
            updateBarchart(barchartField1, barchartField2);
        }
    }, true);
}

var currentRDdata;
var RDdata;

function getData() {
    Papa.parse("data/ToolData.csv", {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: function (results) {
            currentRDdata = results.data;
            RDdata = JSON.parse(JSON.stringify(currentRDdata));
            createMap();
        }
    });
}


function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] == variable) {
            return pair[1];
        }
    }
    return (null);
}


function updateQueryOptions() {

    var futureCheck = (sliderHolder.classList.contains("disabled") ? false : true);
    var sliderSettingsValues = (sliderSettings && sliderHolder.classList.contains("disabled") == false) ? Object.values(sliderSettings).join(";") : null;

    var outputData = document.querySelector(".barchartSourceData button.active").getAttribute("data-type");

    var query = "?future=" + futureCheck + "&slider=" + sliderSettingsValues + "&output=" + outputData;

    window.history.replaceState('searchquery', 'searchqueryedit', query);
}

// first 4 (0-10) Stepwise 1,2,3,4,5, last (1.4 - 3), continuous
function addSlidersToPage() {
    if (getQueryVariable("future") == "true") {
        var presetValues = getQueryVariable("slider").split(";");
    }


    var sliderElements = document.querySelectorAll("#sliderBarWrapper .sliderBar");

    for (var i = 0; i < sliderElements.length; i++) {
        var slider = document.getElementById(sliderElements[i].id);

        if (i == (sliderElements.length - 1)) {
            var options = {
                start: [0.8],
                range: {
                    'min': 0.4,
                    'max': 1
                },
                pips: {
                    mode: 'count',
                    values: 7,
                    density: 11,
                    format: wNumb({
                        decimals: 1
                    }),
                    stepped: true
                },
                step: 0.05,
                tooltips: [false],
            }
        } else {
            var options = {
                start: ((sliderElements[i].getAttribute("category") == "population") ? [1] : [0]),
                range: {
                    'min': 0,
                    'max': 2
                },
                pips: {
                    mode: 'count',
                    values: 5,
                    density: 6,
                    stepped: true,
                    format: {
                        to: updatePips
                    }
                },
                step: 1,
                tooltips: [false],
            }

        }

        noUiSlider.create(slider, options);

        if (presetValues && presetValues[i]) {
            slider.noUiSlider.set(presetValues[i]);
        }


        slider.noUiSlider.on("change", function (values, handle) {
            onSliderChange();
        });
    }

    if (presetValues) {
        toggleDataSetting(document.querySelector(".control[setting='future']"));
    }
}

function updatePips(value, type) {
    if (value == 0) {
        return "Not<br>important";
    } else if (value == 1) {
        return "Somewhat<br>important";
    } else if (value == 2) {
        return "Very<br>important";
    }
}

function onSliderChange() {
    getSliderValues();
    calculateRDspending();
}

var sliderSettings;

function getSliderValues() {
    sliderSettings = {};
    var sliders = document.querySelectorAll(".sliderBar");
    for (var i = 0; i < sliders.length; i++) {
        var sliderCategory = sliders[i].getAttribute("category");
        var sliderValue = Number(sliders[i].noUiSlider.get());
        sliderSettings[sliderCategory] = sliderValue;
        if (sliderCategory == "extraGovSpending") {
            sliders[i].parentNode.querySelector(".sliderValue").innerHTML = sliderValue.toFixed(2) + "%";
        } else {
            sliders[i].parentNode.querySelector(".sliderValue").innerHTML = sliderValue;
        }
    }

}

var map;

function createMap() {
    map = L.map('map', {
        keyboard: false,
        dragging: false,
        zoomControl: false,
        scrollWheelZoom: false,
    }).setView([52.4862, -1.8904], 11);

    //CartoDB layer names: light_all / dark_all / light_nonames / dark_nonames
    var CartoLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
    });

    CartoLayer.addTo(map);
    getNuts1Geojson();

}

var nuts1Geojson;

function getNuts1Geojson() {
    // do a search for some companies, i will get something returned
    var xhr = new XMLHttpRequest();

    xhr.addEventListener("load", function (event) {
        var nuts1Geojson = JSON.parse(xhr.responseText);
        addGeojsonToMap(nuts1Geojson);
        addSlidersToPage();
    });

    // Define what happens in case of error
    xhr.addEventListener("error", function (event) {
        console.log("error");
    });

    xhr.addEventListener("timeout", function (event) {
        console.log("timeout");
    });

    // Set up our request
    xhr.open("GET", "data/UK_NUTS1.geojson");

    // The data sent is what the user provided in the form
    xhr.send();
}

var nuts1Layer;

function addGeojsonToMap(nuts1Geojson) {
    nuts1Layer = L.geoJSON(nuts1Geojson, {
        style: {
            weight: 1,
            fillColor: "#118dff",
            lineColor: "#118dff"
        }
    }).bindPopup(function (layer) {
        return createFeaturePopup(layer.feature.properties.NUTS_ID); //merely sets the tooltip text
    }).bindTooltip(function (layer) {
        return nutsIDToName(layer.feature.properties.NUTS_ID); //merely sets the tooltip text
    }, {
        className: 'leafletTooltip'
    }).on('popupclose', function (e) {
        map.panTo(nuts1Layer.getBounds().getCenter());
    }).addTo(map);

    map.fitBounds(nuts1Layer.getBounds());
    updatePage("Business R&D (£/person)", "Public R&D (£/person)");


}

function createFeaturePopup(nutsID) {
    var popupHolder = document.createElement("div");
    var regionRDdata = RDdata.find(function (entry) {
        return entry.RegionCode ==
            nutsID
    });
    for (var field in regionRDdata) {
        if (field.indexOf("population adjusted") == -1 && field != "RegionCode" && field != "Business R&D spending today") {
            var fieldHolder = document.createElement("div");
            if (field == "Manufacturing as % of GDP") {
                var suffix = "%";
            } else {
                var suffix = "";
            }
            var fieldValue = regionRDdata[field];
            if (isNaN(regionRDdata[field]) == false) {
                fieldValue = Number(regionRDdata[field].toFixed(2)).toLocaleString();
            }
            fieldHolder.innerHTML = "<strong>" + field + ": </strong>" + fieldValue + suffix;
            popupHolder.appendChild(fieldHolder);
        }
    }

    return popupHolder;
}

function nutsIDToName(nutsID) {
    return RDdata.find(function (entry) {
        return entry.RegionCode ==
            nutsID
    }).Region;
}

function mapControlButtonPress(element) {
    if (element.classList.contains("active") == false) {
        if (document.querySelector(".mapControls .active")) {
            document.querySelector(".mapControls .active").classList.remove("active");
        }
        element.classList.add("active");
        updateMap(element.getAttribute("field"));
    }
}

function updatePage(field1, field2) {
    updateMap(field2);
    updateBarchart(field1, field2);
    updateScatterChart(field2, field1);
    updateExplanation();
    mapControlButtonPress(document.querySelector("button[field='Public R&D (£/person)']"));
}

function updateScatterChart(field1, field2) {

    var scatterChartData = {
        datasets: createDatasets(field1, field2)
    }

    // Destroy chart variable if previously set
    if (window.myScatter) {
        window.myScatter.destroy()
    }

    var ctx = document.getElementById('canvas').getContext('2d');

    window.myScatter = Chart.Scatter(ctx, {
        data: scatterChartData,
        options: {
            title: {
                display: false,
                fontFamily: "Poppins-Regular",
                fontSize: 16,
                text: 'Business spend vs. Government spend'
            },
            legend: {
                display: false
            },
            legendCallback: function (chart) {
                // Return the HTML string here.
                return createChartLegend();
            },
            scales: {
                xAxes: [{
                    ticks: {
                        fontFamily: "Poppins-Regular",
                        suggestedMin: 0, // minimum will be 0, unless there is a lower value.
                        // OR //
                        beginAtZero: true, // minimum value will be 0.
                        max: getMaxChartValue(500)
                    },
                    scaleLabel: {
                        display: true,
                        labelString: field1,
                        fontFamily: "Poppins-Regular"
                    }
                    }],
                yAxes: [{
                    ticks: {
                        fontFamily: "Poppins-Regular",
                        suggestedMin: 0, // minimum will be 0, unless there is a lower value.
                        // OR //
                        beginAtZero: true, // minimum value will be 0.

                    },
                    scaleLabel: {
                        display: true,
                        labelString: field2,
                        fontFamily: "Poppins-Regular"
                    }
                    }]
            },
            animation: false,
            showAllTooltips: true,
            maintainAspectRatio: false,
            responsive: true,
            tooltips: {
                caretSize: 0,
                xPadding: 2,
                yPadding: 0,

                displayColors: false,
                titleFontSize: 8,
                bodyFontFamily: "Poppins-Regular",
                bodyFontStyle: "bold",
                bodyFontSize: 9,
                bodyFontColor: "black",
                backgroundColor: "transparent",
                titleFontFamily: "Poppins-Regular",
                titleFontColor: "black",
                callbacks: {

                    // use label callback to return the desired label
                    label: function (tooltipItem, data) {
                        var dataIndex = tooltipItem.datasetIndex;
                        var yAlignBottomLocations = ["UKE", "UKN", "UKC"];
                        if (data.datasets[dataIndex].futureData == false) {
                            if (yAlignBottomLocations.indexOf(RDdata[dataIndex].RegionCode) > -1) {
                                return ["", RDdata[dataIndex].Region];
                            } else {
                                return [RDdata[dataIndex].Region, ""];
                            }
                        } else if (data.datasets[dataIndex].futureData == true && tooltipItem.index > 0) {
                            var yAlignBottomLocations = ["UKE", "UKN", "UKC"];
                            if (yAlignBottomLocations.indexOf(RDdata[dataIndex].RegionCode) > -1) {
                                return ["", RDdata[dataIndex].Region];
                            } else {
                                return [RDdata[dataIndex].Region, ""];
                            }
                        }
                    }
                }

            }
        }
    });

    chartLegend.innerHTML = window.myScatter.generateLegend();
}

function getMaxChartValue(standardValue) {
    // Default works for most cases
    var max = standardValue;
    // Expand range if future spending value entirely dependent on manufacturing
    if (sliderHolder.classList.contains("disabled") == false && sliderSettings.research == 0 && sliderSettings.population == 0 && sliderSettings.businessSpending == 0 && sliderSettings.costs == 0 && sliderSettings.extraGovSpending > 0.8) {
        var max = standardValue + 200;
    }
    return max;
}

function createChartLegend() {
    var chartLegend = "";

    var currentSpending = "<li><span class='legendKey current'>&nbsp;</span><span class='legendLabel'>Gov. spending today</span></li>";
    chartLegend += currentSpending;

    if (sliderHolder.classList.contains("disabled") == false) {
        var futureSpending = "<li><span class='legendKey future'>&nbsp;</span><span class='legendLabel'>Gov. future spending</span></li>";
        chartLegend += futureSpending;
    }

    return chartLegend;
}

function createDatasets(field1, field2) {
    var datasets = [];

    // Include all current data points
    for (var i = 0; i < currentRDdata.length; i++) {
        datasets.push({
            borderColor: "rgb(17,141,255)",
            pointBorderColor: ["rgb(17,141,255)", "rgb(230, 31, 71)"],
            backgroundColor: ["rgba(17,141,255,0.5)", "rgba(230, 31, 71,0.5)"],
            data: generateData(field1, field2, i),
            tension: 0,
            showLine: true,
            fill: false,
            borderColor: "rgba(23,23,23,0.25)",
            borderDash: [8, 4],
            borderWidth: 1,
            futureData: (sliderHolder.classList.contains("disabled") == false) ? true : false
        });
    }

    return datasets;

}

function generateData(field1, field2, index) {
    var data = [{
        x: currentRDdata[index][field1],
        y: currentRDdata[index][field2],
        showLabel: true
     }];

    if (sliderHolder.classList.contains("disabled") == false) {
        data.push({
            x: RDdata[index][field1],
            y: RDdata[index][field2],
            showLabel: true
        })
    }

    return data;
}

function updateMap(field) {
    var fieldToColour = {
        "Public R&D (£/person)": "#e61f47",
        "Business R&D (£/person)": "#118dff"
    }
    var layers = nuts1Layer.getLayers();
    var maxOfField = getMaxOfField(RDdata, field)
    for (var i = 0; i < layers.length; i++) {
        var nutsId = layers[i].feature.properties.NUTS_ID;
        var fieldValue = RDdata.find(function (entry) {
            return entry.RegionCode == nutsId
        })[field];
        var fieldOpacity = 0.8 * (fieldValue / maxOfField);
        layers[i].setStyle({
            fillOpacity: fieldOpacity,
            fillColor: fieldToColour[field],
            color: fieldToColour[field]
        });
    }
    map.closePopup();
}

function getMaxOfField(array, field) {
    return Math.max.apply(null, array.map(function (entry) {
        return entry[field]
    }));
}

var barchartField1;
var barchartField2;

var stripy = '<pattern id="diagonalHatch" width="3" height="10" patternTransform="rotate(30 0 0)" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="10" style="stroke:#ffb5c4; stroke-width:2;" /></pattern>';

function updateBarchart(field1, field2) {
    barchartField1 = field1;
    barchartField2 = field2;

    var data = formatBarchartData(field1, field2);

    el = S('#barchartHolder');

    // Update portraits section
    if (data) {
        b = new BarChart(
            "rd",
            el.find('.barchartContent'),
            'rd',
            data, {
                'colours': [{
                    'colour': "#118dff"
                    }, {
                    'colour': "#e61f47"
                    }, {
                    'colour': '#1DD3A7',
                    pattern: stripy
        }],
                'labelColour': 'black',
                /*'asPercent': false,*/
                'title': '',
                'font-size': 18,
                'line-height': 40,
                'font-family': "arial",
                'key': [{
                    'title': formatKeyTitle("Government spend (£/pers.)"),
                    'colours': {
                        'colour': "#e61f47"
                    }
                    }, {
                    'title': formatKeyTitle("Business spend (£/pers.)"),
                    'labelColour': 'black',
                    'colours': {
                        'colour': "#118dff"
                    }
                    }]
            }
        );


    }
}

function formatBarchartData(field1, field2) {
    var data = {};
    for (var i = 0; i < RDdata.length; i++) {
        data[RDdata[i].Region] = [RDdata[i][field1], RDdata[i][field2]];
    }
    return data;
}


function BarChart(a, el, typ, data, attr) {

    // Absolute values are needed adjust the data
    if (document.querySelector(".barchartSourceData button.active").getAttribute("data-type") == "absolute") {
        for (var region in data) {
            var regionPopulation = currentRDdata.find(function (entry) {
                return entry.Region == region;
            })["Population"];
            for (var i = 0; i < data[region].length; i++) {
                data[region][i] = data[region][i] * regionPopulation;
            }
        }
    }

    if (!attr) attr = {};

    // Add the element
    el.html('<div id="' + a + '-' + typ + '" class="barchart"></div>');

    // Set the height
    if (attr.height) el.find('.barchart').css({
        'height': attr.height + 'px'
    });
    if (!attr.labelFormat) attr.labelFormat = function (i, cat, v) {
        return (i == 0 ? cat : '');
    };
    if (!attr.valueFormat) attr.valueFormat = function (v, t) {
        if (attr.asPercent) {
            return Math.round((v / t) * 100) + '%';
        } else {
            // my edit
            return v.toFixed(0);
        }
    };

    var txt, tel, dy, bw, n, max, h, spacing, total, labelwidth, nbars, i, k, paper, bars, pc, yoff, w, mid, x, y, lcolour, xlabel, tcolour, tanchor;

    n = 0;
    max = [];
    spacing = 8;
    h = el.find('.barchart').outerHeight();
    paper = new SVG(a + '-' + typ);
    paper.clear();
    labelwidth = 0;
    nbars = 0;
    bars = {};
    total = [];

    for (var cat in data) {
        if (cat != "Total") {
            bars[cat] = {
                'labels': [],
                'values': []
            };
            if (typeof data[cat] === "number") data[cat] = [data[cat]];
            for (i = 0; i < data[cat].length; i++) {
                if (typeof max[i] === "undefined") max[i] = 0;
                if (typeof total[i] === "undefined") total[i] = 0;
                max[i] = Math.max(data[cat][i], max[i]);
                total[i] += data[cat][i];
                if (typeof attr.labelFormat === "function") bars[cat].labels[i] = attr.labelFormat(i, cat, data[cat][i]);
                else bars[cat].labels[i] = cat;

                txt = paper.text(0, 0, bars[cat].labels[i]).attr({
                    'stroke': 'black',
                    'fill': 'black',
                    'stroke-width': 0,
                    'text-anchor': 'start',
                    'dominant-baseline': 'middle'
                });
                paper.draw();
                tel = S('#' + txt.id)[0];
                if (tel) labelwidth = Math.max(labelwidth, Math.round(tel.getComputedTextLength()));
                paper.clear();

            }

            n++;
        }
    }

    max = 0;
    // Set the value labels for each bar
    n = 0;
    for (cat in data) {
        if (cat != "Total") {
            nbars = data[cat].length;
            for (i = 0; i < nbars; i++) {
                if (attr.asPercent) {
                    pc = (data[cat][i] / total[i]) * 100;
                    bars[cat].values[i] = Math.round(pc) + '%';
                    if (typeof attr.valueFormat === "function") bars[cat].values[i] = attr.valueFormat(data[cat][i], total[i]);
                    max = Math.max(pc, max);
                } else {
                    pc = data[cat][i];
                    bars[cat].values[i] = pc;
                    if (typeof attr.valueFormat === "function") bars[cat].values[i] = attr.valueFormat(data[cat][i], total[i]);
                    max = Math.max(pc, max);
                }
            }
            n++;
        }
    }

    // Get the value label width
    var pcwidth = 0;
    if (!attr.valueAlign || attr.valueAlign == "end") {
        for (cat in bars) {
            if (bars[cat]) {
                for (i = 0; i < bars[cat].values.length; i++) {
                    txt = paper.text(0, 0, bars[cat].values[i]).attr({
                        'stroke': 'black',
                        'fill': 'black',
                        'stroke-width': 0,
                        'text-anchor': 'start',
                        'dominant-baseline': 'middle'
                    });
                    paper.draw();
                    tel = S('#' + txt.id)[0];
                    if (tel) pcwidth = Math.max(pcwidth, Math.round(tel.getComputedTextLength()));
                    paper.clear();
                }
            }
        }
    }
    if (labelwidth > 0) labelwidth += spacing;

    yoff = (attr['line-height'] || 0);

    // Work out the height of a category
    dy = (h - spacing * (n - 1) - spacing * 2 - yoff) / n;

    // Get the maximum bar width
    bw = (paper.w - labelwidth - spacing - pcwidth);

    if (!attr.colours) attr.colours = [{
        'colour': '#ff6600'
        }, {
        'colour': '#169BD5'
        }, {
        'colour': '#1DD3A7',
        pattern: stripy
        }];

    n = 0;
    // Draw key
    if (attr.key) {
        for (k = 0; k < attr.key.length; k++) attr.key[k].svg = paper.text(paper.w, (attr['line-height'] + attr['font-size']) / 2, attr.key[k].title).attr({
            'stroke': 'black',
            'fill': 'black',
            'stroke-width': 0,
            'text-anchor': 'end',
            'dominant-baseline': 'middle',
            'font-size': attr['font-size'] * 0.6
        });
        paper.draw();
        for (k = 0; k < attr.key.length; k++) {
            tel = S('#' + attr.key[k].svg.id)[0];
            attr.key[k].width = tel.getComputedTextLength();
        }
        paper.clear();
        w = attr['line-height'] * 0.7;
        h = attr['font-size'];
        mid = (attr['line-height']) / 2;
        x = paper.w;
        for (k = 0; k < attr.key.length; k++) {
            paper.text(x, mid, attr.key[k].title).attr({
                'stroke': 'black',
                'fill': 'black',
                'stroke-width': 0,
                'text-anchor': 'end',
                'dominant-baseline': 'central',
                'font-size': attr['font-size'] * 0.6
            });
            x -= (attr.key[k].width + w + 5);
            paper.rect(x, mid - h / 2, w, h, 0, 0).attr({
                'fill': (attr.key[k].colours.pattern ? 'url(#' + attr.key[k].colours.pattern.replace(/.*id="([^\"]*)".*/, function (m, p1) {
                    return p1;
                }) + ')' : attr.key[k].colours.colour)
            });
            x -= 10;
        }
    }

    // Define any patterns
    for (i = 0; i < attr.colours.length; i++) {
        if (attr.colours[i].pattern) paper.pattern(attr.colours[i].pattern);
    }

    // Set the starting position
    y = spacing + yoff;

    // Draw title
    if (attr.title) {
        paper.text(0, (attr['line-height']) / 2, attr.title).attr({
            'stroke': 'black',
            'fill': 'black',
            'stroke-width': 0,
            'text-anchor': 'start',
            'dominant-baseline': 'central',
            'font-size': attr['font-size'],
            'font-family': attr['font-family']
        });
    }


    for (cat in data) {
        if (cat != "Total") {
            nbars = data[cat].length;

            for (i = 0; i < nbars; i++) {
                if (attr.asPercent) pc = (data[cat][i] / total[i]) * 100;
                else pc = data[cat][i];

                if (document.querySelector(".barchartSourceData button.active").getAttribute("data-type") == "absolute") {
                    var max = 300 * 8989881;
                } else {
                    // Set arbitrary max so bars scale as public funding is increased.
                    var max = getMaxChartValue(900);
                }
                // Group label
                lcolour = (attr.labelColour ? attr.labelColour : attr.colours[i].colour);
                if (bars[cat].labels[i]) paper.text(labelwidth - spacing, y + dy * 0.5 / nbars, bars[cat].labels[i]).attr({
                    'stroke': lcolour,
                    'fill': lcolour,
                    'stroke-width': 0,
                    'text-anchor': 'end',
                    'dominant-baseline': 'central',
                    /*my update*/
                    'font-size': attr['font-size'] * 0.6
                });
                paper.rect(labelwidth, y, bw * (pc / max), dy / nbars, 0, 0).attr({
                    'fill': (attr.colours[i].pattern ? 'url(#' + attr.colours[i].pattern.replace(/.*id="([^\"]*)".*/, function (m, p1) {
                        return p1;
                    }) + ')' : attr.colours[i].colour)
                });

                // If future calculations on for public funding.
                if (sliderHolder.classList.contains("disabled") == false && i > 0) {
                    var currentValue = currentRDdata.find(function (entry) {
                        return entry.Region == cat
                    })["Public R&D (£/person)"];
                    if (document.querySelector(".barchartSourceData button.active").getAttribute("data-type") == "absolute") {
                        currentValue = currentValue * currentRDdata.find(function (entry) {
                            return entry.Region == cat
                        })["Population"];
                    }
                    paper.rect(labelwidth, y, bw * (currentValue / max), dy / nbars, 0, 0).attr({
                        'fill': 'url(#' + attr.colours[2].pattern.replace(/.*id="([^\"]*)".*/, function (m, p1) {
                            return p1;
                        }) + ')'
                    });
                }

                // Bar value
                xlabel = labelwidth + spacing + bw * (pc / max);
                tcolour = (attr.valueColour ? attr.valueColour : attr.colours[i].colour);
                tanchor = 'start';
                if (attr.valueAlign == "middle") {
                    xlabel = labelwidth + spacing + bw * (pc / max) * 0.5;
                    tanchor = 'middle';
                }


                // Update labels with new values
                if (i == 0) {
                    var barLabel = formatValue(bars[cat].values[i]);
                } else {
                    if (sliderHolder.classList.contains("disabled") == false) {
                        var futureValue = bars[cat].values[i];
                        var regionEntry = currentRDdata.find(function (entry) {
                            return entry.Region == cat
                        });
                        var todayValue = regionEntry["Public R&D (£/person)"];
                        if (document.querySelector(".barchartSourceData button.active").getAttribute("data-type") == "absolute") {
                            todayValue = todayValue * regionEntry["Population"];
                        }

                        var change = formatValue(futureValue - todayValue);

                        if ((futureValue - todayValue) > 0) {
                            change = "+" + change;
                        } else {
                            change = change;
                        }

                        var barLabel = formatValue(bars[cat].values[i]) + " (" + change + ")";
                    } else {
                        var barLabel = formatValue(bars[cat].values[i]);
                    }
                }
                xlabel = xlabel - 6;
                paper.text(xlabel, y + dy * 0.5 / nbars, barLabel).attr({
                    'stroke': tcolour,
                    'fill': tcolour,
                    'stroke-width': 0,
                    'text-anchor': tanchor,
                    'dominant-baseline': 'central',
                    /*my update*/
                    'font-size': attr['font-size'] * 0.5
                });
                y += dy / nbars;
            }
            y += spacing;
            n++;
        }
    }
    paper.draw();
    return this;
}

function formatKeyTitle(title) {
    // Absolute values are needed
    if (document.querySelector(".barchartSourceData button.active").getAttribute("data-type") == "absolute") {
        // Update title units
        return title.replace("£/pers.", "£");
    } else {
        return title;
    }
}

function formatValue(num, precision) {
    if (precision == undefined) {
        precision = 2;
    }
    return (Math.abs(num) >= 1000000) ? (num / 1000000000).toFixed(precision) + "bn" : num;
}


// From https://stackoverflow.com/questions/36992922/chart-js-v2-how-to-make-tooltips-always-appear-on-pie-chart
function registerChartPlugin() {
    Chart.pluginService.register({
        beforeRender: function (chart) {
            var tooltipIndex = 0;
            if (chart.config.options.showAllTooltips) {
                // create an array of tooltips
                // we can't use the chart tooltip because there is only one tooltip per chart
                chart.pluginTooltips = [];
                chart.config.data.datasets.forEach(function (dataset, i) {
                    chart.getDatasetMeta(i).data.forEach(function (sector, j) {

                        var newTooltip = new Chart.Tooltip({
                            _chart: chart.chart,
                            _chartInstance: chart,
                            _data: chart.data,
                            _options: chart.options.tooltips,
                            _active: [sector]
                        }, chart);

                        tooltipIndex++;
                        chart.pluginTooltips.push(newTooltip);
                    });
                });

                // turn off normal tooltips
                chart.options.tooltips.enabled = false;
            }

        },
        afterDraw: function (chart, easing) {
            if (chart.config.options.showAllTooltips) {
                // we don't want the permanent tooltips to animate, so don't do anything till the animation runs atleast once
                if (!chart.allTooltipsOnce) {
                    if (easing !== 1)
                        return;
                    chart.allTooltipsOnce = true;
                }

                // turn on tooltips
                chart.options.tooltips.enabled = true;
                Chart.helpers.each(chart.pluginTooltips, function (tooltip) {
                    tooltip.initialize();
                    tooltip.update();
                    // we don't actually need this since we are not animating tooltips
                    tooltip.pivot();
                    tooltip.transition(easing).draw();
                });
                chart.options.tooltips.enabled = false;
            }
        }
    });
}

function futureSituationOn() {
    sliderHolder.classList.remove("disabled");
    calculateRDspending();
}

function futureSituationOff() {
    sliderHolder.classList.add("disabled");
    RDdata = JSON.parse(JSON.stringify(currentRDdata));
    updatePage("Business R&D (£/person)", "Public R&D (£/person)");

}

//var ukGDP = 2060494000000;
//var ukPopulation = 65379044;

// We are using 2016 figures everywhere now
var ukGDP = 1960000000000;
var ukPopulation = 65650000;


var businessProportionOfRD = 2 / 3;
var governmentProportionOfRD = 1 / 3;

function calculateRDspending() {
    getSliderValues();
    if (getExtraWeightingFactorTotal() != 0) {
        priorityWarning.classList.add("hidden");
        var extraGovSpendingPercent = sliderSettings.extraGovSpending;
        var totalGovRDspending = ukGDP * (extraGovSpendingPercent / 100);
        var totalGovRDspendingPerPerson = totalGovRDspending / ukPopulation;

        //var manufacturingFactor = sliderSettings.manufacturing;
        //  RDdata = calculateFutureRDdata(businessTotalRDspendingPerPerson, governmentTotalRDspendingPerPerson);

        RDdata = calculateWeightedFutureRDdata(totalGovRDspending);

        updatePage("Business R&D (£/person)", "Public R&D (£/person)");
        updateQueryOptions();
    } else {
        priorityWarning.classList.remove("hidden");
    }

}

function getSumOfColumn(field) {
    var sum = 0;
    for (var i = 0; i < currentRDdata.length; i++) {
        sum += currentRDdata[i][field];
    }
    return sum;
}

function calculateWeightedFutureRDdata(totalGovRDspending) {
    var data = JSON.parse(JSON.stringify(currentRDdata));

    var fieldsToWeightBy = [
        {
            slider: "population",
            field: "Population"
        },
        {
            slider: "research",
            field: "REF score"
        },
        {
            slider: "businessSpending",
            field: "Business R&D spending today"
        },
        {
            slider: "costs",
            field: "GVA inverse population adjusted"
        },
        {
            slider: "manufacturing",
            field: "Manufacturing GVA adjusted"
        }
    ];

    // Total of all weighting factors to normalised. 
    var weightingFactorSum = getExtraWeightingFactorTotal();

    for (var i = 0; i < data.length; i++) {
        var regionPopulation = data[i].Population;

        // Start with population weighting factor
        var weightingFactorsTotal = 0;

        for (var j = 0; j < fieldsToWeightBy.length; j++) {
            var field = fieldsToWeightBy[j].field;
            var weighting = sliderSettings[fieldsToWeightBy[j].slider];
            var fieldWeightingTotal = weighting * (data[i][field] / getSumOfColumn(field));
            weightingFactorsTotal += fieldWeightingTotal;
        }

        // console.log(data[i].Region + " weightingFactors: " + weightingFactorsTotal.toFixed(3));
        var regionRDperRegion = (totalGovRDspending / weightingFactorSum) * weightingFactorsTotal;
        // console.log(data[i].Region + " regionRDperRegion: " + regionRDperRegion.toFixed(0));
        var regionRDperPerson = regionRDperRegion / regionPopulation;
        // console.log(data[i].Region + " regionRDperPerson: " + regionRDperPerson.toFixed(0));
        data[i]["Public R&D (£/person)"] = regionRDperPerson;
    }

    return data;
}

function getExtraWeightingFactorTotal() {
    var factorTotal = 0;
    for (var field in sliderSettings) {
        if (field != "extraGovSpending") {
            factorTotal += sliderSettings[field];
        }
    }
    return factorTotal;
}

function calculateFutureRDdata(businessTotalRDspendingPerPerson, governmentTotalRDspendingPerPerson) {
    var data = JSON.parse(JSON.stringify(currentRDdata));

    for (var i = 0; i < data.length; i++) {
        data[i]["Business R&D (£/person)"] = businessTotalRDspendingPerPerson;
        data[i]["Public R&D (£/person"] = governmentTotalRDspendingPerPerson;

    }

    return data;
}

function toggleDataSetting(element) {
    if (element.classList.contains("active") == false) {
        document.querySelector(".active").classList.remove("active");
        element.classList.add("active");
        var dataSetting = element.getAttribute("setting");
        if (dataSetting == "future") {
            futureSituationOn();
        } else {
            futureSituationOff();
        }
        updateQueryOptions();
    }
}

function toggleBarchartSourceData(element) {
    if (element.classList.contains("active") == false) {
        document.querySelector(".barchartSourceData button.active").classList.remove("active");
        element.classList.add("active");
        updateBarchart("Business R&D (£/person)", "Public R&D (£/person)");
        updateQueryOptions();
    }
}

// var ukGDP = 2060494000000;
// var ukPopulation = 65379044;
// var businessProportionOfRD = 2 / 3;
// var governmentProportionOfRD = 1 / 3;

function updateExplanation() {
    var currentGovValue = 0.55;
    var currentPrivateValue = 1.13;

    governmentRDpercent.innerHTML = currentGovValue;
    var govRDvalue = (currentGovValue / 100) * ukGDP;
    govermentRDtotal.innerHTML = formatValue(govRDvalue, 1);

    privateRDpercent.innerHTML = currentPrivateValue;
    var privateRDvalue = (currentPrivateValue / 100) * ukGDP;
    privateRDtotal.innerHTML = formatValue(privateRDvalue, 1);

    if (sliderHolder.classList.contains("disabled") == false) {
        futureRDpercent.innerHTML = sliderSettings.extraGovSpending;
        var futureRDvalue = (sliderSettings.extraGovSpending / 100) * ukGDP;
        futureRDtotal.innerHTML = formatValue(futureRDvalue, 1);
        var futureChange = futureRDvalue - govRDvalue;
        if (futureChange < 0) {
            futureRDchange.innerHTML = "a decrease of £" + formatValue(Math.abs(futureChange), 1);
        } else {
            futureRDchange.innerHTML = "an increase of £" + formatValue(futureChange, 1);
        }

        totalFutureRD.innerHTML = (sliderSettings.extraGovSpending * 3).toFixed(1);
        futureExplanation.style.display = "inline";
    } else {
        futureExplanation.style.display = "none";
    }
}

if (!Object.values) {
    Object.values = function values(O) {
        return reduce(keys(O), (v, k) => concat(v, typeof k === 'string' && isEnumerable(O, k) ? [O[k]] : []), []);
    };
}
