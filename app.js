function addCommas(nStr) {
    // https://stackoverflow.com/a/5731241
    nStr += '';
    var x = nStr.split('.');
    var x1 = x[0];
    var x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
}

function cleanClassName(x) {
    return x.split(" ")[0].replace("+", "plus")
}

function getGenres(data, genre) {
    var genres = new Map()
    let sortable = []
    data.filter(function (d) {
        return genre != 'All' ? d.Genres.includes(genre) : true
    })
        .map(function(v, i) {
        // return v.Genres;
        v.Genres.split(", ").forEach(function(g) {
            if (genres.has(g)) {
                genres.set(g, genres.get(g) + 1)
            } else {
                genres.set(g, 1)
            }
        });
    })
    genres.forEach(function(v, i) {
        sortable.push([i, v])
    })
    sortable.sort(function(a, b) {
        return b[1] - a[1];
    })
    return sortable;
}

function getOptions(a, b) {

}

function draw_scatter(data, div='#my_dataviz', genre='All', yax='Members', 
range=[20, 7500000], scale='linear', color_group='Type', options=[], annotations=[]) {
    var margin = { top: 50, right: 30, bottom: 50, left: 60 },
        width = 1000 - margin.left - margin.right,
        height = 560 - margin.top - margin.bottom;

    var svg = d3.select(div)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    var tooltip = d3.select(div)
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "1px")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .style("position", "absolute")
    

    // Colors
    var color = d3.scaleOrdinal(d3.schemeCategory10);
    // Add X axis
    var x = d3.scaleTime()
        .domain([new Date("1917-01-01 00:00:00"), new Date("2022-03-10 00:00:00")])
        .range([0, width]);
    var xaxis = svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));
    // Add Y axis
    if (scale == 'linear') {
        var y = d3.scaleLinear()
    } else {
        var y = d3.scaleLog()
    }
    y
        .domain(range)
        .range([height, 0]);
    var yaxis = svg.append("g")
        .call(d3.axisLeft(y));
    // Do not draw anything outside of clip (for when we zoom/pan)
    var clip = svg.append("defs")
        .append("svg:clipPath")
        .attr("id", "clip")
        .append("svg:rect")
        .attr("width", width)
        .attr("height", height)
        .attr("x", 0)
        .attr("y", 0);
    var zoom = d3.zoom()
        .scaleExtent([.5, 20])
        .extent([[0, 0], [width, height]])
        .on("zoom", updateChart);
    // invisible rect to catch pointer events. BEFORE drawing plot itself so the rect does not prevent mouseover
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .call(zoom);

    function updateChart() {
        // recover the new scale
        var newX = d3.event.transform.rescaleX(x);
        var newY = d3.event.transform.rescaleY(y);
        // update axes with these new boundaries
        xaxis.call(d3.axisBottom(newX))
        yaxis.call(d3.axisLeft(newY))
        // update circle position
        scatterplot
            .selectAll("circle")
            .attr('cx', function (d) { return newX(d.Start_Date) })
            .attr('cy', function (d) { return newY(d[yax]) });
        // update annotation position
        makeAnnotations
            .accessors({
                x: d => newX(d.Start_Date),
                y: d => newY(d[yax])
            })
            .annotations(annotations)
            .update();
    }

    var mouseover = function (d) {
        d3.select(".tooltip")
            .style("opacity", 1)
        d3.select(this)
            .attr("r", 10)
    }
    
    var mousemove = function (d) {
        d3.select(".tooltip")
            .html("Name: " + d.Name +
                "<br> EN Name: " + d['English name'] +
                "<br>JP Name: " + d['Japanese name'] +
                "<br>Score: " + d.Score +
                "<br> Genres: " + d.Genres +
                "<br> MAL Members: " + addCommas(d.Members) +
                "<br> Aired: " + d.Aired +
                "<br> Episodes: " + parseInt(d.Episodes) +
                "<br> Source: " + d.Source +
                "<br> Studios: " + d.Studios)
            .style("top", (d3.event.pageY + 5) + "px")
            .style("left", (d3.event.pageX + 5) + "px")
    }
    
    var mouseleave = function (d) {
        d3.select(".tooltip")
            .transition()
            .duration(25)
            .style("opacity", 0)
        d3.select(this)
            .attr("r", function (d) { return Math.exp(d.Score) / Math.exp(7.5) + 1; })
    }

    function inOptions(d, options) {
        if (options.length == 0) {
            return d[color_group]
        } else {
            if (color_group != 'Genres') {
                return options.includes(d[color_group]) ? d[color_group] : 'Other'
            } else {
                for (var i = options.length-1; i >= 0; i--) {
                    if (d.Genres.includes(options[i])) {
                        return options[i]
                    }
                }
                return 'Other'
            }
        }
    }

    function getClasses(d, options) {
        if (color_group != 'Genres') {
            return cleanClassName(d[color_group])
        } else {
            var genreList = d.Genres.split(', ')
            var classes = ''
            for (var i = 0; i < genreList.length; i++) {
                classes += genreList[i] + ' '
            }
            for (var i = 0; i < options.length; i++) {
                if (genreList.includes(options[i])) {
                    break;
                }
                classes += 'Other'
            }
            return classes
        }
    }

    // Draw scatterplot
    var scatterplot = svg.append('g')
        .attr("clip-path", "url(#clip)")
    scatterplot
        .selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .filter(function (d) { return (d.Aired != "Unknown") && (genre != 'All' ? d.Genres.includes(genre) : true) })
        .attr("cx", function (d) { return x(d.Start_Date); })
        .attr("cy", function (d) { return y(d[yax]); })
        .attr("r", function (d) { return Math.exp(d.Score) / Math.exp(7.5) + 1; })
        .style("fill", function (d) { return color(inOptions(d, options)); })
        .attr("class", function (d) { return getClasses(d, options); })
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseleave", mouseleave)

    var legend_options = options
    if (legend_options.length > 0) {
        legend_options.push('Other')
    }
    // Legend
    svg.selectAll("dots")
        .data(legend_options.length > 0 ? legend_options : d3.map(data, function (d) { return inOptions(d, options); }).keys())
        .enter()
        .append("circle")
        .attr("cx", 30)
        .attr("cy", function (d, i) { return 20 + i * 25 }) // spacing
        .attr("r", 7)
        .style("fill", function (d) { return color(d) })
        .on("click", function (d) {
            console.log(cleanClassName(d))
            console.log(d3.selectAll("." + cleanClassName(d)))
            currentOpacity = d3.selectAll("." + cleanClassName(d)).style("opacity");
            d3.selectAll("." + cleanClassName(d)).transition().style("opacity", currentOpacity == 1 ? 0 : 1);
            d3.selectAll("." + cleanClassName(d))
                .on("mouseover", currentOpacity == 1 ? null : mouseover)
                .on("mousemove", currentOpacity == 1 ? null : mousemove)
                .on("mouseleave", currentOpacity == 1 ? null : mouseleave)
        })
    svg.selectAll("labels")
        .data(legend_options.length > 0 ? legend_options : d3.map(data, function (d) { return inOptions(d, options); }).keys())
        .enter()
        .append("text")
        .attr("x", 50)
        .attr("y", function (d, i) { return 25 + i * 25 }) 
        .style("fill", function (d) { return color(d) })
        .text(function (d) { return d })
        .attr("text-anchor", "left")
        .style("alignment-baseline", "middle")
        .on("click", function (d) {
            currentOpacity = d3.selectAll("." + cleanClassName(d)).style("opacity");
            d3.selectAll("." + cleanClassName(d)).transition().style("opacity", currentOpacity == 1 ? 0 : 1);
            d3.selectAll("." + cleanClassName(d))
                .on("mouseover", currentOpacity == 1 ? null : mouseover)
                .on("mousemove", currentOpacity == 1 ? null : mousemove)
                .on("mouseleave", currentOpacity == 1 ? null : mouseleave)
        })
    
    // axis labels
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x",0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("log(Members)");  
    svg.append("text")             
        .attr("transform",
              "translate(" + (width/2) + " ," + 
                             (height + margin.top + 20) + ")")
        .style("text-anchor", "middle")
        .text("Airing Year");

    // annotations
    var makeAnnotations = d3.annotation()
        .notePadding(15)
        .type(d3.annotationLabel)
        .accessors({
            x: d => x(d.Start_Date),
            y: d => y(d[yax])
        })
        .annotations(annotations)
    svg.append("g")
        .attr("class", "annotations")
        .call(makeAnnotations)

    // title
    svg.append("text")
        .attr("x", (width / 2))             
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")  
        .style("font-size", "16px") 
        .style("text-decoration", "underline")  
        .text("Anime Releases by Member Count, grouped by " + color_group);
}

function rng(start, end) {
    // https://stackoverflow.com/a/24654548
    var total = [];
    if (!end) {
        end = start;
        start = 0;
    }
    for (var i = start; i < end; i += 1) {
        total.push(i);
    }
    return total;
}

function draw_area(data, div='#my_dataviz', range=[0, 3000], annotations=[]) {
    var margin = { top: 50, right: 30, bottom: 50, left: 60 },
        width = 1000 - margin.left - margin.right,
        height = 560 - margin.top - margin.bottom;

    var svg = d3.select(div)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");
    
    // genres = getGenres(data, genre)
    // console.log(genres);
    // console.log(data[0][0].data.values)
    var all_genres = new Set();
    data[0][0].data.values.map(function(v, i) {
        all_genres.add(v.Genre)
    })
    all_genres = Array.from(all_genres)

    var tooltip = d3.select(div)
        .append("div")
        // .attr("class", "remove")
        .style("position", "relative")
        // .style("visibility", "hidden")
        .style("top", "-500px")
        .style("left", "100px")
        .style("opacity", 0)
        .style('width', "500px");

    // Colors
    var color = d3.scaleOrdinal(d3.schemeCategory10);
    // Add X axis
    var x = d3.scaleLinear()
        .domain([1917, 2020])
        .range([0, width]);
    var xaxis = svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));
    // Add Y axis
    var y = d3.scaleLinear()
    y
        .domain(range)
        .range([height, 0]);
    var yaxis = svg.append("g")
        .call(d3.axisLeft(y));

    svg.selectAll(".layer")
        .data(data)
        .enter()
        .append("path")
        .attr("class", "layer")
        .style("fill", function(d) { 
            tmp = all_genres[d.key-1]
            return color(tmp) 
        })
        .attr("d", 
            d3.area()
            .x(function(d, i) { return x(d.data.key); })
            .y0(function(d) { return y(d[0]); })
            .y1(function(d) { return y(d[1]); })
        )
    
    svg.selectAll(".layer")
        .style("opacity", .9)
        .on("mouseover", function(d, i) {
            d3.select(".tooltip")
                .style("opacity", 1)
            svg.selectAll(".layer")
                .style("opacity", function(d, j) {
                    return j != i ? .6 : 1;
                })
                // .style("fill", "#B30000")
        })
        .on("mousemove", function(d, i) {
            d3.select(this)
                .classed("hover", true)
                .attr("stroke-width", "0.5px") 
            var df = d[100].data.values[this.__data__.key]
            tooltip
                .html("Genre: " + df.Genre +
                    "<br>Total Anime: " + df.Total +
                    "<br>Top 5 Anime by Member Count: " +
                    "<br>" + df.Top_Anime.split(',')[0] +
                    "<br>" + df.Top_Anime.split(',')[1] +
                    "<br>" + df.Top_Anime.split(',')[2] +
                    "<br>" + df.Top_Anime.split(',')[3] +
                    "<br>" + df.Top_Anime.split(',')[4])
                .style("opacity", 1);
        })
        .on("mouseout", function(d, i) {
            svg.selectAll(".layer")
                .style("opacity", 1);
            d3.select(this)
                .classed("hover", false)
                .attr("stroke-width", "0px")
            tooltip
                .style("opacity", 0);
        });

    // axis labels
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Count");
    svg.append("text")             
        .attr("transform",
              "translate(" + (width/2) + " ," + 
                             (height + margin.top + 20) + ")")
        .style("text-anchor", "middle")
        .text("Airing Year");
    
    // annotations
    var makeAnnotations = d3.annotation()
        .notePadding(15)
        .type(d3.annotationLabel)
        .accessors({
            x: d => x(d.data.key),
            y: d => y(d[0])
        })
        .annotations(annotations)

    svg.append("g")
        .attr("class", "annotations")
        .call(makeAnnotations)

    // title
    svg.append("text")
        .attr("x", (width / 2))             
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")  
        .style("font-size", "16px") 
        .style("text-decoration", "underline")  
        .text("Number of Anime Released over Time by Genre");
}
