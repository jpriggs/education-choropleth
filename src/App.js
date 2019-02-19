import React from 'react';
import './App.css';
var d3 = require('d3');
var topojson = require('topojson');

class ChoroplethMap extends React.Component {
  constructor(props) {
    super(props);
    this.createChoropleth = this.createChoropleth.bind(this);
  }
  componentDidMount() {
    this.createChoropleth();
  }
  createChoropleth() {
    const chartWidth = 960;
    const chartHeight = 600;
    let eduApiData = this.props.data;
    let topoApiData = this.props.topology;

    //Inspired from: https://bl.ocks.org/chucklam/f628765b873d707a3d0e44ffc78deab8

    //SVG declarations
    let svg = d3.select('#chart').append('svg'),
        width = svg.attr('width', chartWidth),
        height = svg.attr('height', chartHeight);
    let path = d3.geoPath();
    let tooltip = d3.select('#chart')
      .append('div')
      .attr('class', 'tooltip')
      .attr('id', 'tooltip')
      .style('opacity', 0);

    //Map x-scale definition
    let xScale = d3.scaleLinear()
      .domain([2.6, 75.1])
      .rangeRound([600, 860]);

    let color = d3.scaleThreshold()
      .domain(d3.range(2.6, 75.1, (75.1-2.6)/8)) //min, max, [division values between]
      .range(d3.schemeBlues[9]);

    //Create legend element
    let g = svg.append('g')
      .attr('class', 'key')
      .attr('id', 'legend')
      .attr('transform', 'translate(0, 40)');

    //Legend color scale
    g.selectAll('rect')
      .data(color.range().map((d) => {
        d = color.invertExtent(d);
        if(d[0] == null) d[0] = xScale.domain()[0];
        if(d[1] == null) d[1] = xScale.domain()[1];
        return d;
      }))
      .enter()
      .append('rect')
      .attr('height', 8)
      .attr('x', (d) => xScale(d[0]))
      .attr('width', (d) => xScale(d[1]) - xScale(d[0]))
      .attr('fill', (d) => color(d[0]));

    //Legend axis markings
    g.call(d3.axisBottom(xScale)
      .tickSize(13)
      .tickFormat((d) => Math.round(d) + '%')
      .tickValues(color.domain()))
      .selectAll('text')
      .attr('x', 8)
      .select('.domain')
      .remove();

    //Legend title - "Higher Education Holders"
    g.append('text')
      .attr('class', 'legend-caption')
      .attr('x', xScale.range()[0])
      .attr('y', -6)
      .attr('fill', '#000')
      .attr('text-anchor', 'start')
      .attr('font-weight', 'bold')
      .text('Higher education holders');

    //Draw counties on map
    svg.append('g')
      .attr('class', 'counties')
      .selectAll('path')
      .data(topojson.feature(topoApiData, topoApiData.objects.counties).features)
      .enter()
      .append('path')
      .attr('class', 'county')
      .attr('data-fips', (d) => d.id)
      .attr('data-education', (d) => {
        let result = eduApiData.filter(obj => {
          return obj.fips === d.id;
        });
        if(result[0]) {
          return result[0].bachelorsOrHigher;
        }
      })
      .attr('fill', (d) => {
        let result = eduApiData.filter(obj => {
          return obj.fips === d.id;
        });
        if(result[0]) {
          return color(result[0].bachelorsOrHigher);
        }
      })
      .attr('d', path)
      //Tooltip functionality
      .on('mouseover', (d) => {
        tooltip.style('opacity', 0.9)
          .html(function() {
            let result = eduApiData.filter(obj => {
              return obj.fips === d.id;
            });
            if(result[0]) {
              return result[0]['area_name'] + ', ' + result[0]['state'] + ': ' + result[0].bachelorsOrHigher + '%';
            }
          })
          .style('left', (d3.event.pageX - 110) + 'px')
          .style('top', (d3.event.pageY - 28) + 'px');
      })
      .on('mouseout', (d) => {
        tooltip.style('opacity', 0);
      });

    //Draw states on map
    svg.append('path')
      .datum(topojson.mesh(topoApiData, topoApiData.objects.states, (a, b) => a !== b))
      .attr('class', 'states')
      .attr('d', path);
  }
  render() {
    return(
      <div id='chart'></div>
    )
  }
}
class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      topology: {}
    }
    this.setJsonData = this.setJsonData.bind(this);
  }
  componentDidMount() {
    let eduData = fetch('https://raw.githubusercontent.com/no-stack-dub-sack/testable-projects-fcc/master/src/data/choropleth_map/for_user_education.json')
      .then(response => response.json());
    let topoData = fetch('https://raw.githubusercontent.com/no-stack-dub-sack/testable-projects-fcc/master/src/data/choropleth_map/counties.json')
      .then(response => response.json());
    Promise.all([eduData, topoData])
      .then(values => {
        eduData = values[0];
        topoData = values[1];
        this.setJsonData(eduData, topoData);
      });
  }
  setJsonData(edu, topo) {
    let eduArr = edu.map((d) => d);
    let topoObj = topo;
    this.setState({ data: eduArr, topology: topoObj });
  }
  render() {
    return(
      <div className='main'>
        <div className='chart-container'>
          <div id='title'>United States Educational Attainment</div>
          <div id='description'>Percentage of adults age 25 and older with a bachelor's degree or higher (2010-2014)</div>
          {this.state.data.length > 0 &&
            <ChoroplethMap data={this.state.data} topology={this.state.topology} />
          }
        </div>
      </div>
    )
  }
}

export default App;
