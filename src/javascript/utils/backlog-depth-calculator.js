Ext.define('RallyTechServices.backlogreadydepth.utils.BacklogDepthCalculator',{

    constructor: function(config){
        //    velocityData: data.slice(-1)[0],
        //    backlogData: data.slice(0,data.length-2),
        this.iterationData = config.iterationData;
        this.numSprintsToTrend = config.numSprintsToTrend;
        this.numSprintsForAverageVelocity = config.numSprintsForAverageVelocity;
        this.projects = config.projects;
        this.futureIterations = config.futureIterations || [];

        this._calculateVelocity(config.velocityData, this.iterationData);
        this._aggregateBacklogSnaps(config.backlogData, this.iterationData);
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
            data.push(this._calculateBacklogDepth(p,iterationDataIndex));
        }, this);
        return data;
    },
    _calculateBacklogDepth: function(project, iterationDataIndex){
        var projectId = project.get('ObjectID'),
            futureIterations = Ext.Array.clone(this.futureIterations); //this and all iterations after is ok.

        console.log('projects', projectId, project.get('Name'),this.iterationData[iterationDataIndex]);
        for (var i = iterationDataIndex; i<this.iterationData.length; i++){
            if (!this.iterationData[i]._iterationOids){
                this.iterationData[i]._iterationOids = Ext.Array.map(this.iterationData[i]._iterations, function(i){ return i.ObjectID });
            }
            futureIterations = futureIterations.concat(this.iterationData[i]._iterationOids);
        }
        //for the project and its children, we need to make sure the iteration isn't in the past.
        var totalPoints = 0,
            projects = [],
            snaps = this.iterationData[iterationDataIndex]._snaps;

        for (var i=0; i<snaps.length; i++){
            var snap = snaps[i].getData();
            console.log('snap', snap);
            if (Ext.Array.contains(snap._ProjectHierarchy, projectId) && (!snap.Iteration || Ext.Array.contains(futureIterations, snap.Iteration))){
                totalPoints += snap.PlanEstimate || 0;
                projects.push(snap.Project);
            }
        }
        projects = Ext.Array.unique(projects);
        console.log('projects', projects, totalPoints);
        var projectVelocities = {};
        var startVelocity = iterationDataIndex - this.numSprintsForAverageVelocity;
        for (var i=startVelocity; i<iterationDataIndex; i++) {
            var iterationData = this.iterationData[i];
            for (var j=0; j<projects.length; j++){
                var proj = projects[j];
                console.log('proj', proj, iterationData, i, iterationDataIndex,this.numSprintsForAverageVelocity, startVelocity );
                if (!projectVelocities[proj]){
                    projectVelocities[proj] = [];
                }
                projectVelocities[proj].push(iterationData._projectVelocity[proj])
            }
        }

        console.log('projectVelocities', projectId, projectVelocities);
        if (projects.length > 0){
            var velocities = projectVelocities[projectId];

            var avgVelocity = Ext.Array.mean(velocities);
            if (avgVelocity > 0){
                var x = Math.round(totalPoints/avgVelocity * 100);
                return x/100;
            }
        }
        return 0;
    },
    _aggregateBacklogSnaps: function(backlogData, iterationData){
        console.log('_aggregateBacklogSnaps', backlogData);
        var backlogMaxIndex = iterationData.length - this.numSprintsForAverageVelocity;
        for (var i=0; i<backlogMaxIndex; i++){
            iterationData[i + this.numSprintsForAverageVelocity]._snaps = backlogData[i];
            console.log('_aggregateBacklogSnaps',iterationData[i + this.numSprintsForAverageVelocity], backlogData[i] );
        }

    },
    _calculateVelocity: function(velocityData, iterationData){
        var velocity = {};
        Ext.Array.each(velocityData, function(r){
            var iteration = r.get('Iteration').ObjectID.toString();
            if (!velocity[iteration]){
                velocity[iteration] = 0;
            }
            velocity[iteration] += r.get('PlanEstimate') || 0;
        });
        console.log('velocity', velocity);

        Ext.Array.each(iterationData, function(id){
            var projectVelocities = {};
            Ext.Array.each(id._iterations, function(i){
                var key = i.ObjectID,
                    projectKey = i.Project.ObjectID;

                console.log('i', i.ObjectID,velocity,velocity[key],key);
                projectVelocities[projectKey] = velocity[key] || null;
            });
            id._projectVelocity = projectVelocities;
            console.log('projectVelocities', projectVelocities);
        });
        console.log('iteationdata', iterationData);
    },
    getCategories: function(){
        return Ext.Array.map(this.projects, function(p){
            return p.get('Name');
        });
    },
    getPlotBands: function(settings){
        return [{
            from: settings.outerThreshold[0],
            to: settings.innerThreshold[0],
            color: settings.outerColor
        },{
            from: settings.innerThreshold[0],
            to: settings.innerThreshold[1],
            color: settings.innerColor
        },{
            from: settings.innerThreshold[1],
            to: settings.outerThreshold[1],
            color: settings.outerColor
        }];
    }
});
