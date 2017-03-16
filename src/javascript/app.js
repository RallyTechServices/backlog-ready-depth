Ext.define("backlog-ready-depth", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'message_box',tpl:'Hello, <tpl>{_refObjectName}</tpl>'},
        {xtype:'container',itemId:'display_box'}
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
            workItemTypes: ['HierarchicalRequirement','Defect'],
            relativeProjectDepth: 1
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
    lookbackBacklogFetch: ['Project','Iteration','ObjectID',"_ProjectHierarchy","PlanEstimate"],

    velocityFetch: ['Project','ObjectID','Iteration','PlanEstimate'],

    launch: function() {
        this.updateView();
    },
    updateView: function(){
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
            });
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
    fetchIterationBoundarySnapshots: function(iterationInfo){

        var offsetDays = 0,
            atDate = Rally.util.DateTime.add(iterationInfo.StartDate, "day", offsetDays);

        var config = Ext.clone(this.lookbackBacklogFilter);
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
     * Returns information about the projects that we will be using to report backlog depth on
     * @returns {*}
     */
    fetchProjectBuckets: function(iterations){
        this.logger.log('fetchProjectBuckets', iterations);
        this.addIterationsToIterationData(iterations);

        var props = ["ObjectID"];
        for (var i=0; i<this.getRelativeProjectDepth(); i++){ props.unshift("Parent"); }
        var parentFilterProperty = props.join('.');

        return RallyTechServices.backlogreadydepth.utils.Toolbox.fetchWsapiRecords({
            model: 'Project',
            fetch: ['Name','ObjectID','Parent'],
            filters: [{
                property: parentFilterProperty,
                value: this.getContext().getProject().ObjectID
            },{
                property: 'State',
                value: 'Open'
            }],
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
                operator: '<',
                value: Rally.util.DateTime.toIsoString(new Date())
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
            var obj = {
                StartDate: i.get('StartDate'),
                EndDate: i.get('EndDate'),
                Name: i.get('Name'),
                _iterations: []
            };
            iterationData.push(obj);
        },this,true);

        //we will put the iterations in ascending order for easier access
        this.iterationData = iterationData;

        //todo we need to deal with timezone?
        var iterationStartDate = iterationData[0].StartDate;  //Rally.util.DateTime.toIsoString(iterationInfoRecords.slice(-1)[0].get('StartDate'));

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
        var currentDate = new Date(),
            futureIterations = [];
        this.logger.log('addIterationsToIterationData iterations found:', iterations.length);

        for (var i=0; i<this.iterationData.length; i++){
            var it = this.iterationData[i];
            for (var j=iterations.length - 1 ; j>=0; j--){
                if (iterations[j].get('StartDate') > currentDate){
                    futureIterations.push(iterations[j].get('ObjectID'));
                    iterations.splice(j,1);
                } else if (iterations[j].get('Name') === it.Name){
                    it._iterations.push(iterations[j].getData());
                    iterations.splice(j,1);
                }
            }
        }
        this.futureIterations = futureIterations;
        this.logger.log('addIterationsToIterationData', this.iterationData, iterations, futureIterations);
    },
    addAppMessage: function(msg){
        this.add({
            xtype: 'container',
            html: msg
        });
    },

    buildChart: function(data){
        this.logger.log('processData', data);
        if (!data) { return; }

        var calc = Ext.create('RallyTechServices.backlogreadydepth.utils.BacklogDepthCalculator',{
            iterationData: this.iterationData,
            projects: this.projects,
            velocityData: data.slice(-1)[0],
            backlogData: data.slice(0,data.length-1),
            numSprintsForAverageVelocity: this.getNumSprintsForAverageVelocity(),
            numSprintsToTrend: this.getNumSprintsToTrend(),
            relativeProjectDepth: this.getRelativeProjectDepth(),
            futureIterations: this.futureIterations
        });

        this.add({
            xtype: 'rallychart',
            chartColors: this.chartColors,
            chartConfig: {
                chart: {
                    type: 'bar',
                    plotBackgroundColor: this.getSetting('outsideColor')
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
                            enabled: false
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
        return this.getSetting('workItemTypes') || ['HierarchicalRequirement', 'Defect'];
    },
    getRelativeProjectDepth: function(){
        return this.getSetting('relativeProjectDepth') || 2;
    },
    showErrorNotification: function(msg){
        Rally.ui.notify.Notifier.showError({message: msg});
    },
    getSettingsFields: function(){

        var defaults = {
            labelAlign: 'right',
            labelWidth: 100
        };

        var numSprintsToTrend =  Ext.Object.merge({
            xtype: 'rallynumberfield',
            fieldLabel: '# Sprints to Trend',
            name: 'numSprintsToTrend',
            maxValue: 6,
            minValue: 1
        }, defaults);


        return [
            numSprintsToTrend
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
