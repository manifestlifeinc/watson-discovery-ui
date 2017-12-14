/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License'); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Header, Menu, Dropdown, Divider } from 'semantic-ui-react';
import { Doughnut } from 'react-chartjs-2';
const utils = require('../utils');

/**
 * This object renders a sentiment graph object that appears at the bottom
 * of the web page. It is composed of multiple objects, the graph,
 * and 2 drop-down menus where the user can select what filter (entities,
 * categories, or concepts) and/or what filter value (referred to as 'term') 
 * to represent. 
 * NOTE: the filter value of 'Term' indicates all values.
 * NOTE: what the user selects to represent in the graph has no effect
 *       on any other objects on the page. It is just manipulating the
 *       search data already retrieved.
 */
export default class SentimentChart extends React.Component {
  constructor(...props) {
    super(...props);

    this.state = {
      entities: this.props.entities,
      categories: this.props.categories,
      concepts: this.props.concepts,
      keywords: this.props.keywords,
      chartType: utils.ENTITIY_FILTER,
      termValue: utils.TERM_ITEM
    };

    this.totals = {
      positiveNum: 0,
      neutralNum: 0,
      negativeNum: 0,
      matches: 0
    };
  }

  /**
   * filterTypeChange - user has selected a new filter type. This will
   * change the filter type values available to select from.
   */
  filterTypeChange(event, selection) {
    this.setState({
      chartType: selection.value,
      termValue: utils.TERM_ITEM
    });
  }

  /**
   * getTotals - add up all of the sentiment values for a specific 
   * group of objects (entities, categories, and concepts).
   */
  getTotals(collection, termValue) {
    this.totals.matches = 0;
    this.totals.positiveNum = 0;
    this.totals.neutralNum = 0;
    this.totals.negativeNum = 0;

    for (var item of collection.results) {
      if (termValue === '' || termValue === utils.TERM_ITEM || termValue === item.key) {
        this.totals.matches = this.totals.matches + item.matching_results;
        for (var sentiment of item.aggregations[0].results) {
          if (sentiment.key === 'positive') {
            this.totals.positiveNum = this.totals.positiveNum + sentiment.matching_results;
          } else if (sentiment.key === 'neutral') {
            this.totals.neutralNum = this.totals.neutralNum + sentiment.matching_results;
          } else if (sentiment.key === 'negative') {
            this.totals.negativeNum = this.totals.negativeNum + sentiment.matching_results;
          }
        }
      }
    }
  }

  /**
   * getChartData - based on what group filter user has selected, accumulate 
   * all of the data needed to render the sentiment chart.
   */
  getChartData() {
    const {
      chartType,
      termValue,
      entities,
      categories,
      concepts,
      keywords
    } = this.state;
    
    // console.log('chartType: ' + chartType);
    if (chartType === utils.ENTITIY_FILTER) {
      this.getTotals(entities, termValue);
    } else if (chartType === utils.CATEGORY_FILTER) {
      this.getTotals(categories, termValue);
    } else if (chartType === utils.CONCEPT_FILTER) {
      this.getTotals(concepts, termValue);
    } else if (chartType === utils.KEYWORD_FILTER) {
      this.getTotals(keywords, termValue);
    }

    // console.log('    totalMatches: ' + this.totals.matches);
    // console.log('    totalPositive: ' + this.totals.positiveNum);
    // console.log('    totalNeutral: ' + this.totals.neutralNum);
    // console.log('    totalNegative: ' + this.totals.negativeNum);

    var ret = {
      // legend
      labels: [
        'Positive',
        'Neutral',
        'Negative'
      ],
      datasets: [{
        // raw numbers
        data: [
          this.totals.positiveNum,
          this.totals.neutralNum,
          this.totals.negativeNum
        ],
        // colors for each piece of the graph
        backgroundColor: [
          '#358D35',
          '#C2C2C2',
          '#C6354D'
        ],
        hoverBackgroundColor: [
          '#358D35',
          '#C2C2C2',
          '#C6354D']
      }]
    };
    return ret;
  }

  /**
   * termTypeChange - user has selected a new term filter value. This will
   * modify the sentiment chart to just represent this term.
   */
  termTypeChange(event, selection) {
    this.setState({
      termValue: selection.value
    });
  }

  /**
   * getTermOptions - get the term items available to be selected by the user.
   */
  getTermOptions() {
    const { chartType, entities, categories, concepts, keywords } = this.state;
    var options = [{ key: -1, value: utils.TERM_ITEM, text: utils.TERM_ITEM }];
    var collection;

    // select based on the filter type
    if (chartType === utils.ENTITIY_FILTER) {
      collection = entities.results;
    } else if (chartType === utils.CATEGORY_FILTER) {
      collection = categories.results;
    } else if (chartType === utils.CONCEPT_FILTER) {
      collection = concepts.results;
    } else if (chartType === utils.KEYWORD_FILTER) {
      collection = keywords.results;
    }

    if (collection) {
      collection.map(item =>
        options.push({key: item.key, value: item.key, text: item.key})
      );
    }

    return options;
  }
  
  // Important - this is needed to ensure changes to main properties
  // are propagated down to our component. In this case, some other
  // search or filter event has occured which has changed the list of 
  // items we are graphing.
  componentWillReceiveProps(nextProps) {
    this.setState({ entities: nextProps.entities });
    this.setState({ categories: nextProps.categories });
    this.setState({ concepts: nextProps.concepts });
    this.setState({ keywords: nextProps.keywords });
  }

  /**
   * render - return all the sentiment objects to render.
   */
  render() {
    const options = {
      responsive: true,
      legend: {
        position: 'bottom'
      },
      animation: {
        animateScale: true,
        animateRotate: true
      },
      tooltips: {
        callbacks: {
          label: function(tooltipItem, data) {
            // convert raw number to percentage of total
            var dataset = data.datasets[tooltipItem.datasetIndex];
            var total = dataset.data.reduce(function(previousValue, currentValue) {
              return previousValue + currentValue;
            });
            var currentValue = dataset.data[tooltipItem.index];
            var precentage = Math.floor(((currentValue/total) * 100)+0.5);
            return precentage + '%';
          }
        }
      }
    };

    return (
      <div>
        <Header as='h2' textAlign='left'>Sentiment</Header>
        <Menu compact floated={true}>
          <Dropdown 
            item
            onChange={ this.filterTypeChange.bind(this) }
            defaultValue={ utils.ENTITIY_FILTER }
            options={ utils.filterTypes }
          />
        </Menu>
        <Menu compact floated={true}>
          <Dropdown 
            item
            scrolling
            defaultValue={ utils.TERM_ITEM }
            onChange={ this.termTypeChange.bind(this) }
            options={ this.getTermOptions() }
          />
        </Menu>
        <Divider clearing hidden/>
        <div>
          <Doughnut 
            data={ this.getChartData() }
            options={ options }
            width={ 350 }
            height={ 200 }
          />       
        </div>
      </div>
    );
  }
}

// type check to ensure we are called correctly
SentimentChart.propTypes = {
  entities: PropTypes.object,
  categories: PropTypes.object,
  concepts: PropTypes.object,
  keywords: PropTypes.object,
  chartType: PropTypes.string,
  termValue: PropTypes.string
};
