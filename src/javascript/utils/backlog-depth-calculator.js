Ext.define('RallyTechServices.backlogreadydepth.utils.BacklogDepthCalculator',{

    constructor: function(config){
        this.iterationData = config.iterationData;
        this.numSprintsForAverageVelocity = config.numSprintsForAverageVelocity;
        this.projects = config.projects;
    },
    getChartData: function(){
        var series = [];

        for (var i=this.numSprintsForAverageVelocity; i<this.iterationData.length; i++){
            series.push({
                name: this.iterationData[i].Name,
                data: this._getBacklogDepthData(i)
            });
        }

        return {
            series: series,
            categories: this.getCategories()
        };
    },
    _getBacklogDepthData: function(iterationDataIndex){
        var data = [];

        Ext.Array.each(this.projects, function(p){
            var backlogDepth = this._calculateBacklogDepth(p,iterationDataIndex);
            data.push(backlogDepth);
        }, this);

        return data;
    },
    _calculateBacklogDepth: function(project, iterationDataIndex){
        var projectId = project.get('ObjectID');

        var iterationData = this.iterationData[iterationDataIndex];

        var velocities = [];
        for (var i=1; i <= this.numSprintsForAverageVelocity; i++){
            var idx = iterationDataIndex - i;
            velocities.push(this.iterationData[idx].getVelocity(projectId));
        }

        var avgVelocity = Ext.Array.mean(velocities),
            totalPoints = iterationData.getTotalPlanEstimate(projectId);

       // console.log('_calculateBacklogDepth', project.get('Name'), iterationData.Name, totalPoints, avgVelocity, velocities);
        if (avgVelocity > 0){
            var x = Math.round(totalPoints/avgVelocity * 100);
            return x/100;
        }

        return 0;
    },
    getCategories: function(){
        return Ext.Array.map(this.projects, function(p){
            return p.get('Name');
        });
    },
    getPlotBands: function(settings){
        return [{
            from: settings.outerThresholdStart,
            to: settings.innerThresholdStart,
            color: settings.outerColor
        },{
            from: settings.innerThresholdStart,
            to: settings.innerThresholdEnd,
            color: settings.innerColor
        },{
            from: settings.innerThresholdEnd,
            to: settings.outerThresholdEnd,
            color: settings.outerColor
        }];
    },
    getSummaryExportCSV: function(){

        var headers = ["Team"],
            csv = [];
        for (var i=this.numSprintsForAverageVelocity; i<this.iterationData.length; i++){
            headers.push(this.iterationData[i].Name);
        }
        csv.push(headers.join(','));

        for (var c=0; c<this.projects.length; c++){
            var row = [this.projects[c].get('Name')];
            for (var i=this.numSprintsForAverageVelocity; i<this.iterationData.length; i++){
                row.push(this._calculateBacklogDepth(this.projects[c],i));
            }
            csv.push(row.join(','));
        }
        return csv.join('\r\n');

    },
    getVelocityExportCSV: function(){
        var headers = ["Team"],
            csv = [];
        for (var i=0; i<this.iterationData.length; i++){
            headers.push(this.iterationData[i].Name);
        }
        csv.push(headers.join(','));

        for (var c=0; c<this.projects.length; c++){
            var row = [this.projects[c].get('Name')];
            for (var i=0; i<this.iterationData.length; i++){
                row.push(this.iterationData[i].getVelocity(this.projects[c].get('ObjectID')));
            }
            csv.push(row.join(','));
        }
        return csv.join('\r\n');
    },
    getDetailedExportCSV: function(){
        //var headers = ["Team","Team ObjectID","Iteration Name","FormattedID","PlanEstimate"],  //Includes ugly project ObjectID
        var headers = ["Team","Iteration Name","FormattedID","PlanEstimate"],
            csv = [];
        csv.push(headers.join(','));

        for (var c=0; c<this.projects.length; c++){
            var team = this.projects[c].get('Name'),
                teamId = this.projects[c].get('ObjectID');

            for (var i=this.numSprintsForAverageVelocity; i<this.iterationData.length; i++){
                var iterationName = this.iterationData[i].Name,
                    snaps = this.iterationData[i].getSnapsForProject(teamId);
                for (var j=0; j<snaps.length; j++){
                   // var row = [team, teamId, iterationName, snaps[j].FormattedID, snaps[j].PlanEstimate];  //Includes ugly project ObjectID
                    var row = [team, iterationName, snaps[j].FormattedID, snaps[j].PlanEstimate];
                    csv.push(row.join(','));
                }
            }
        }
        return csv.join('\r\n');
    }
});
