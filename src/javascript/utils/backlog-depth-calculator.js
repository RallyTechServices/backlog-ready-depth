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
        //    futureIterations = Ext.Array.clone(this.futureIterations); //this and all iterations after is ok.
        //
        //for (var i = iterationDataIndex; i<this.iterationData.length; i++){
        //    if (!this.iterationData[i]._iterationOids){
        //        this.iterationData[i]._iterationOids = Ext.Array.map(this.iterationData[i]._iterations, function(i){ return i.ObjectID });
        //    }
        //    futureIterations = futureIterations.concat(this.iterationData[i]._iterationOids);
        //}
        ////for the project and its children, we need to make sure the iteration isn't in the past.
        var iterationData = this.iterationData[iterationDataIndex];

        //for (var i=0; i<snaps.length; i++){
        //    var snap = snaps[i].getData();
        //
        //    if (Ext.Array.contains(snap._ProjectHierarchy, projectId) && (!snap.Iteration || Ext.Array.contains(futureIterations, snap.Iteration))){
        //        totalPoints += snap.PlanEstimate || 0;
        //        projects.push(snap.Project);
        //    }
        //}

        var velocities = [];
        for (var i=iterationDataIndex-1; i > 0; i--){
            velocities.push(this.iterationData[i].getVelocity(projectId));
        }

        var avgVelocity = Ext.Array.mean(velocities),
            totalPoints = iterationData.getTotalPlanEstimate(projectId);

        if (avgVelocity > 0){
            var x = Math.round(totalPoints/avgVelocity * 100);
            return x/100;
        }

        return 0;
    },
    //_aggregateBacklogSnaps: function(backlogData, iterationData){
    //    var backlogMaxIndex = iterationData.length - this.numSprintsForAverageVelocity;
    //    for (var i=0; i<backlogMaxIndex; i++){
    //        iterationData[i + this.numSprintsForAverageVelocity]._snaps = backlogData[i];
    //    }
    //
    //},
    /**
     * calculate the velocity
     * @param velocityData
     * @param iterationData
     * @private
     */
    //_calculateVelocity: function(velocityData, iterationData){
    //    var velocity = {};
    //    Ext.Array.each(velocityData, function(r){
    //        var iteration = r.get('Iteration').ObjectID.toString();
    //        if (!velocity[iteration]){
    //            velocity[iteration] = 0;
    //        }
    //        velocity[iteration] += r.get('PlanEstimate') || 0;
    //    });
    //
    //    Ext.Array.each(iterationData, function(id){
    //        var projectVelocities = {};
    //        Ext.Array.each(id._iterations, function(i){
    //            var key = i.ObjectID,
    //                projectKey = i.Project.ObjectID;
    //
    //            projectVelocities[projectKey] = velocity[key] || null;
    //        });
    //        id._projectVelocity = projectVelocities;
    //    });
    //},
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
    getOverflowLabels: function(maxSprints, chart){
        if (maxSprints > 0){
            var labels = [];




            return labels;
        }
        return null;

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

    }
});
