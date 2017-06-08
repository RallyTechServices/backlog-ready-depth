Ext.define("backlog-ready-depth", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'export_box', layout: 'hbox'},
        {xtype:'container',itemId:'grid_box'}
    ],

    integrationHeaders : {
        name : "backlog-ready-depth"
    },

    config: {
        defaultSettings: {
            numSprintsForAverageVelocity: 3,
            numSprintsToTrend: 2,
            innerThreshold: [1,2],
            outerThreshold: [.5,3],
            innerColor: "#e3f9e9",
            outerColor: "#FDFECC",
            outsideColor: "#F2D3D0",
            query: "",
            relativeProjectDepth: 1,
            includeDefects: true,
            maxSprintsOnGraph: 0,
            filterField: null,
            filterValues: null,
            excludeProjectField: null,
            offsetHours: 0
        }
    },
    chartColors: [
        //RallyTechServices.backlogreadydepth.utils.Toolbox.getHighchartsColorWithOpacity(Rally.util.Colors.blue, 0.3),
        //RallyTechServices.backlogreadydepth.utils.Toolbox.getHighchartsColorWithOpacity(Rally.util.Colors.yellow, 0.3),
        //RallyTechServices.backlogreadydepth.utils.Toolbox.getHighchartsColorWithOpacity(Rally.util.Colors.brick, 0.3),
        Rally.util.Colors.cyan,
        Rally.util.Colors.brick,
        Rally.util.Colors.orange,
        Rally.util.Colors.purple,
        Rally.util.Colors.green,
        Rally.util.Colors.lime,
        Rally.util.Colors.red_med,
        Rally.util.Colors.pink_med
    ],
    /**
     * This is used to filter the snapshots at each of the iteration boundaries.
     * in addition to project hierarchy and current date that will be used
     */
    lookbackBacklogFilter: {
        "ScheduleState": "Defined",
        "Ready": true,
        "Blocked": false
    },
    lookbackBacklogFetch: ['Project','Iteration','ObjectID',"_ProjectHierarchy","PlanEstimate","FormattedID"],

    velocityFetch: ['Project','ObjectID','Iteration','PlanEstimate'],

    launch: function() {
        this.logger.log('launch', this.getSettings());
        this.updateView();
    },
    updateView: function(){
        this.setLoading(true);
        this.fetchIterationInfo()
            .then({
                success: this.fetchAllIterations,
                failure: this.showErrorNotification,
                scope: this
            })
            .then({
                success: this.fetchProjectBuckets,
                failure: this.showErrorNotification,
                scope: this
            })
            .then({
                success: this.fetchWorkItemData,
                failure: this.showErrorNotification,
                scope: this
            })
            .then({
                success: this.buildChart,
                failure: this.showErrorNotification,
                scope: this
            }).always(function(){
                this.setLoading(false);
        },this);
    },
    fetchWorkItemData: function(projects){
        //now that we have the iterations and projects, we can fetch the work item data.
        this.projects = projects;
        this.logger.log('fetchWorkItemData', projects, this.iterationData);

        var promises = [];
        for (var i=this.getNumSprintsForAverageVelocity(); i<this.iterationData.length; i++){
            promises.push(this.fetchIterationBoundarySnapshots(this.iterationData[i]));
        }
        promises.push(this.fetchCurrentVelocityData());

        return Deft.Promise.all(promises);
    },
    getOffsetHours: function(){
      return this.getSetting('offsetHours') || 0;
    },
    fetchIterationBoundarySnapshots: function(iterationInfo){

        var offsetHours = this.getOffsetHours(),
            atDate = Rally.util.DateTime.add(iterationInfo.StartDate, "hour", offsetHours);

        var config = Ext.clone(this.lookbackBacklogFilter);

        var filterField = this.getFilterField(),
            filterFieldValues = this.getFilterFieldValues();

        this.logger.log('fetchIterationBoundarySnapshots: filterField', filterField, filterFieldValues);
        if (filterField && filterFieldValues){

            config[filterField] = {$in: filterFieldValues}
        }

        config.__At = Rally.util.DateTime.toIsoString(atDate);
        config._ProjectHierarchy = this.getContext().getProject().ObjectID;

        this.logger.log('fetchIterationBoundarySnapshots', config, iterationInfo);

        return RallyTechServices.backlogreadydepth.utils.Toolbox.fetchLookbackSnapshots({
            findConfig: config,
            fetch: this.lookbackBacklogFetch
        });
    },
    /**
     * fetchs all current accepted work items associated with all iterations so that we can calculate velocity
     */
    fetchCurrentVelocityData: function(){
        return RallyTechServices.backlogreadydepth.utils.Toolbox.fetchWsapiArtifactRecords({
            models: this.getWorkItemTypes(),
            fetch: this.velocityFetch,
            filters: this.getVelocityFilters()
        });
    },
    getVelocityFilters: function(){
        return [{
            property: 'Iteration.StartDate',
            operator: '>=',
            value: Rally.util.DateTime.toIsoString(this.iterationData[0].StartDate)
        },{
            property: 'Iteration.EndDate',
            operator: '<=',
            value: Rally.util.DateTime.toIsoString(new Date())
        },{
            property: 'ScheduleState',
            operator: '>=',
            value: 'Accepted'
        }];
    },
    /**
     * Returns information about the leaf projects in teh current scope
     * @returns {*}
     */
    fetchProjectBuckets: function(iterations){
        this.logger.log('fetchProjectBuckets', iterations);
        this.addIterationsToIterationData(iterations);

        //var props = ["ObjectID"];
        //for (var i=0; i<this.getRelativeProjectDepth(); i++){ props.unshift("Parent"); }
        //var parentFilterProperty = props.join('.');


        var prop = "ObjectID",
            projectId = this.getContext().getProject().ObjectID,
            filters = [{
                property: 'ObjectID',
                value: projectId
            }];
        for (var i = 2; i < 9; i++){
            prop = "Parent." + prop;
            filters.push({
                property: prop,
                value: projectId
            });
        }
        filters = Rally.data.wsapi.Filter.or(filters);

        filters = filters.and({
            property: 'State',
            value: 'Open'
        });

        filters = filters.and({
            property: 'Children.State',
            operator: '!=',
            value: "Open"
        });

        if (this.getProjectExcludeField()){
            filters= filters.and({
                property: this.getProjectExcludeField(),
                operator: '!=',
                value: true
            });
        }

        return RallyTechServices.backlogreadydepth.utils.Toolbox.fetchWsapiRecords({
            model: 'Project',
            fetch: ['Name','ObjectID','Parent'],
            filters: filters,
            sorters: [{
                property: 'Name',
                direction: 'ASC'
            }]
        });
    },
    /**
     * Figures out the start date of the first iteraiton that we are interested in
     * @returns {*}
     */
    fetchIterationInfo: function(){
        this.logger.log('fetchIterationInfo', Rally.util.DateTime.toUtcIsoString(new Date()));
        return RallyTechServices.backlogreadydepth.utils.Toolbox.fetchWsapiRecords({
            model: 'Iteration',
            fetch: ['Name','StartDate','EndDate'],
            pageSize: this.getNumSprintsToTrend() + this.getNumSprintsForAverageVelocity(),
            limit: this.getNumSprintsToTrend() + this.getNumSprintsForAverageVelocity(),
            context: {
                project: this.getContext().getProject()._ref,
                projectScopeDown: false,
                projectScopeUp: false
            },
            filters: [{
                property: 'StartDate',
                operator: '<=',
                value: Rally.util.DateTime.toUtcIsoString(new Date())
            }],
            sorters: [{
                property: 'StartDate',
                direction: 'DESC'
            }]
        });
    },
    /**
     * returns all iterations in scope that have a start date on or after the time that we are interested in.  This will
     * be used to figure out how to calculate backlog depth and also when to get snapshots in time
     * @returns {*}
     */
    fetchAllIterations: function(iterationInfoRecords){
        if (!iterationInfoRecords || iterationInfoRecords.length == 0){
            this.addAppMessage("No iterations defined for the currently scoped project.");
            return null;
        }

        var iterationData = [];
        Ext.Array.each(iterationInfoRecords, function(i){
            var obj = Ext.create('RallyTechServices.backlogreadydepth.utils.IterationData',{
                iterationData: i.getData(),
                logger: this.logger
            });
            iterationData.push(obj);
        },this,true);  //reverse = "true" we will put the iterations in ascending order for easier access
        this.iterationData = iterationData;

        //todo we need to deal with timezone?
        var iterationStartDate = iterationData[0].StartDate;  //Rally.util.DateTime.toIsoString(iterationInfoRecords.slice(-1)[0].get('StartDate'));
        this.logger.log('fetchAllIterations', iterationData, iterationStartDate);

        //Now we want to get all the iterations that we are using for calculating velocity and backlog depth.
        return RallyTechServices.backlogreadydepth.utils.Toolbox.fetchWsapiRecords({
            model: 'Iteration',
            fetch: ['Name','StartDate','EndDate',"Project","ObjectID"],
            filters: [{
                property: 'StartDate',
                operator: '>=',
                value: iterationStartDate
            }],
            sorters: [{
                property: 'StartDate',
                direction: 'DESC'
            }]
        });
    },
    addIterationsToIterationData: function(iterations){

        this.logger.log('addIterationsToIterationData iterations found:', iterations.length);

        for (var i=0; i<this.iterationData.length; i++) {
            this.iterationData[i].processIterations(iterations);
        }
        this.logger.log('addIterationsToIterationData', this.iterationData);
    },
    addAppMessage: function(msg){
        this.add({
            xtype: 'container',
            html: msg
        });
    },
    getMaxSprintsOnGraph: function(){
        var x = this.getSetting('maxSprintsOnGraph');
        if (!x || x<1){
            return undefined;
        }
        return x;
    },
    exportData: function(btn, calculator){
        this.logger.log('export', calculator);

        var menu = Ext.widget({
            xtype: 'rallymenu',
            items: [
                {
                    text: 'Export Backlog Depth Summary...',
                    handler: function() {
                        var csv = calculator.getSummaryExportCSV(),
                            fileName = Ext.String.format('summary-{0}.csv', Rally.util.DateTime.format(new Date(), 'Y-m-d-h-i-s'));
                        RallyTechServices.backlogreadydepth.utils.Toolbox.saveCSVToFile(csv,fileName);
                    },
                    scope: this
                }, {
                    text: 'Export Velocity Summary...',
                    handler: function() {
                        var csv = calculator.getVelocityExportCSV(),
                            fileName = Ext.String.format('velocity-{0}.csv', Rally.util.DateTime.format(new Date(), 'Y-m-d-h-i-s'));
                        RallyTechServices.backlogreadydepth.utils.Toolbox.saveCSVToFile(csv,fileName);
                    },
                    scope: this
                },{
                    text: "Export Backlog Details...",
                    handler: function(){
                        var csv = calculator.getDetailedExportCSV(),
                            fileName = Ext.String.format('details-{0}.csv', Rally.util.DateTime.format(new Date(), 'Y-m-d-h-i-s'));
                        RallyTechServices.backlogreadydepth.utils.Toolbox.saveCSVToFile(csv,fileName);
                    },
                    scope: this
                }
            ]
        });
        menu.showBy(btn.getEl());

    },
    buildChart: function(data){
        this.logger.log('processData', data);

        if (!data) { return; }

        this.down('#export_box').add({
            xtype: 'container',
            flex: 1
        });
        var velocityData = data.slice(-1)[0],
            numSprintsForAverageVelocity = this.getNumSprintsForAverageVelocity();

        for (var i=0; i<this.iterationData.length; i++){
            this.iterationData[i].calculateVelocity(velocityData);
            if (i >= numSprintsForAverageVelocity){
                this.iterationData[i].addSnaps(data[i-numSprintsForAverageVelocity]);
            }
        }

        //for (var i=0; i< backlogMaxIndex; i++){
        //    this.iterationData[i + numSprintsForAverageVelocity].calculateVelocity(velocityData);
        //    this.iterationData[i + numSprintsForAverageVelocity].addSnaps(data[i]);
        //}

        var calc = Ext.create('RallyTechServices.backlogreadydepth.utils.BacklogDepthCalculator',{
            iterationData: this.iterationData,
            projects: this.projects,
            numSprintsForAverageVelocity: numSprintsForAverageVelocity
        });

        var btn = this.down('#export_box').add({
            xtype: 'rallybutton',
            iconCls: 'icon-export',
            cls: 'secondary rly-small'
        });
        btn.on('click', function(){
            this.exportData(btn, calc);
        }, this);


        var maxY = this.getMaxSprintsOnGraph(),
            height = this.getHeight(),
            buttonHeight  = this.down('#export_box').getHeight(),
            maxHeight = Math.max(height-buttonHeight, 100),
            chartHeight = maxHeight * .80;
        this.logger.log('buildChart heights', height, buttonHeight, maxHeight);

        this.down('#grid_box').add({
            xtype: 'rallychart',
            chartColors: this.chartColors,
            height: chartHeight,
            chartConfig: {
                chart: {
                    events: {
                        load: function() {
                            var chart = this;

                            if (chart){
                                Ext.Array.each(chart.series, function(s){
                                    for (var i=0; i< s.yData.length; i++){
                                        if (s.yData[i] > maxY){

                                            chart.renderer.label('<div class="icon-warning"></div>' + s.yData[i], chart.plotSizeY + chart.plotLeft - 50, s.data[i].plotX + chart.plotTop + 15 ,undefined,undefined,undefined,true)
                                                .css({
                                                    fontSize: '12px',
                                                    fontFamily: 'ProximaNova',
                                                    backgroundColor: '#444',
                                                    color: '#444' //s.color //'#FAD200',
                                                })
                                                .add();
                                        }
                                    }
                                });
                            }
                        }
                    },
                    type: 'bar',
                    plotBackgroundColor: this.getSetting('outsideColor'),
                    zoomType: 'y'
                },
                title: {
                    text: '"Ready" Backlog Depth',
                    style: {
                        color: '#666',
                        fontSize: '18px',
                        fontFamily: 'ProximaNova',
                        textTransform: 'uppercase',
                        fill: '#666'
                    }
                },
                subtitle: {
                    text: null
                },

                xAxis: {
                    title: {
                        text: null,
                        style: {
                            color: '#444',
                            fontFamily: 'ProximaNova',
                            textTransform: 'uppercase',
                            fill: '#444'
                        }
                    },
                    labels: {
                        style: {
                            color: '#444',
                            fontFamily: 'ProximaNova',
                            fill: '#444'
                        }
                    }
                },
                yAxis: {
                    min: 0,
                    max: maxY,
                    title: {
                        text: 'Number of Sprints',
                        style: {
                            color: '#444',
                            fontFamily: 'ProximaNova',
                            textTransform: 'uppercase',
                            fill: '#444'
                        }
                    },
                    labels: {
                        overflow: 'justify',
                        style: {
                            color: '#444',
                            fontFamily: 'ProximaNova',
                            fill: '#444'
                        }
                    },
                    plotBands: calc.getPlotBands(this.getSettings())
                },
                tooltip: {
                    valueSuffix: ' sprints',
                    backgroundColor: '#444',
                    useHTML: true,
                    borderColor: '#444',
                    style: {
                        color: '#FFF',
                        fontFamily: 'ProximaNova',
                        fill: '#444'
                    }
                },
                plotOptions: {
                    bar: {
                        dataLabels: {
                            enabled: true,
                            formatter: function(){
                                if (this.y >= maxY){
                                    return '<b>' + this.series.name + '</b><br/><div class="icon-warning" style="color: #fad200;"></div>' + this.y + " Sprints";
                                }
                                return null;
                            },
                            x: -20,
                            useHTML: true,
                            style: {
                                color: '#444',
                                fontFamily: 'ProximaNova',
                                fill: '#444'
                            }
                        },
                        borderWidth: 0
                    }
                },
                legend: {
                    itemStyle: {
                        color: '#444',
                        fontFamily: 'ProximaNova',
                        textTransform: 'uppercase'
                    },
                    borderWidth: 0
                }
            },
            chartData: calc.getChartData()
        });

    },
    getNumSprintsForAverageVelocity: function(){
        return this.getSetting('numSprintsForAverageVelocity') || 3;
    },
    getNumSprintsToTrend: function(){
        return this.getSetting('numSprintsToTrend') || 2;
    },
    getWorkItemTypes: function(){
        var wiTypes = ['HierarchicalRequirement'];
        if (this.getSetting('includeDefects')){
            wiTypes.push('Defect');
        }
        return wiTypes;
    },
    getRelativeProjectDepth: function(){
        return this.getSetting('relativeProjectDepth') || 2;
    },
    getProjectExcludeField: function(){
        return this.getSetting('excludeProjectField') || null;
    },
    getFilterField: function(){
        return this.getSetting('filterField') || null;
    },
    getFilterFieldValues: function(){
        var vals = this.getSetting('filterFieldValues') || null;
        if (Ext.isArray(vals) && vals.length > 0){
            return vals;
        }
        if (Ext.isString(vals) && vals.length > 0){
            return vals.split(',');
        }
        return null;
    },
    showErrorNotification: function(msg){
        this.logger.log('showErrorNotification', msg);
        Rally.ui.notify.Notifier.showError({message: msg});
    },
    getSettingsFields: function(){

        var defaults = {
            labelAlign: 'right',
            labelWidth: 250
        },
            filterValues =  this.getFilterFieldValues();
        this.logger.log('getSettingsFields', filterValues);

        var numSprintsToTrend =  Ext.Object.merge({
            xtype: 'rallynumberfield',
            fieldLabel: '# Sprints to Trend',
            name: 'numSprintsToTrend',
            maxValue: 6,
            minValue: 1
        }, defaults);


        var includeDefects = Ext.Object.merge({
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Include Defects',
            name: 'includeDefects'
        }, defaults);

        var includeProjectsField = Ext.Object.merge({
            xtype: 'booleanfieldcombobox',
            fieldLabel: 'Exclude Project Field',
            name: 'excludeProjectField',
            allowNoEntry: true,
            model: 'Project'
        }, defaults);

        var filterField = Ext.Object.merge({
            xtype:  'dropdownfieldcombobox',
            fieldLabel: 'Filter Field',
            name: 'filterField',
            allowNoEntry: true,
            model: 'HierarchicalRequirement',
            bubbleEvents: ['select']
        }, defaults);

        var filterFieldValues = Ext.Object.merge({
            xtype:  'dynamicfieldvaluecombobox',
            fieldLabel: 'Filter Field Values',
            name: 'filterFieldValues',
            allowNoEntry: false,
            model: 'HierarchicalRequirement',
            field: this.getFilterField(),
            multiSelect: true,
            handlesEvents: {
                select: function(cb){
                    if (cb.getValue()){
                        this.refreshWithNewField(cb.getValue());
                    }
                }
            },
            listeners: {
                ready: function(){
                    if (filterValues){
                        this.setValue(filterValues);
                    }
                }
            }
        }, defaults);

        var maxSprintsOnGraph = Ext.Object.merge({
            xtype: 'rallynumberfield',
            fieldLabel: 'Max # Sprints Visible (0 for no limit)',
            name: 'maxSprintsOnGraph',
            minValue: 0
        }, defaults);

        var outerThresholdStart = Ext.Object.merge({
            xtype: 'rallynumberfield',
            name: 'outerThresholdStart',
            fieldLabel: 'Outer Threshold Start',
            minValue: 0,
            handlesEvents: {
                change: function(nb){
                    if (nb.name === "innerThresholdStart"){
                        this.maxValue = nb.value;
                        this.validate();
                    }
                }
            }
        }, defaults);

        var innerThresholdStart = Ext.Object.merge({
            xtype: 'rallynumberfield',
            name: 'innerThresholdStart',
            fieldLabel: 'Inner Threshold Start',
            minValue: 0,
            bubbleEvents: ['change'],
            handlesEvents: {
                change: function(nb){
                    if (nb.name === "innerThresholdEnd"){
                        this.maxValue = nb.value;
                        this.validate();
                    }
                }
            }
        }, defaults);

        var outerThresholdEnd = Ext.Object.merge({
            xtype: 'rallynumberfield',
            name: 'outerThresholdEnd',
            fieldLabel: 'Outer Threshold End',
            minValue: 0,
            handlesEvents: {
                change: function(nb){
                    if (nb.name === "innerThresholdEnd"){
                        this.minValue = nb.value;
                        this.validate();
                    }
                }
            }

        }, defaults);

        var innerThresholdEnd = Ext.Object.merge({
            xtype: 'rallynumberfield',
            name: 'innerThresholdEnd',
            fieldLabel: 'Inner Threshold End',
            minValue: 0,
            bubbleEvents: ['change'],
            handlesEvents: {
                change: function(nb){
                    if (nb.name === "innerThresholdStart"){
                        this.minValue = nb.value;
                        this.validate();
                    }
                }
            }
        }, defaults);

        var offsetHours = Ext.Object.merge({
            xtype: 'rallynumberfield',
            name: 'offsetHours',
            fieldLabel: 'Offset Hours',
            minValue: -24,
            maxValue: 24
        }, defaults);

        return [
            numSprintsToTrend,
            includeDefects,
            includeProjectsField,
            filterField,
            filterFieldValues,
            maxSprintsOnGraph,
            innerThresholdStart,
            innerThresholdEnd,
            outerThresholdStart,
            outerThresholdEnd,
            offsetHours
        ];
    },

    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },

    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },

    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    }

});
