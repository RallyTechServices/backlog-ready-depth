Ext.define('RallyTechServices.backlogreadydepth.utils.IterationData',{

    StartDate: null,
    EndDate: null,
    Name: null,

    _iterations: null,
    _futureIterations: null,
    _projectVelocity: null,
    _snaps: null,
    _projectTotalPlanEstimates: null,

    _logger: null,

    constructor: function(config){
        if (config.iterationData){
            this.StartDate = config.iterationData.StartDate;
            this.EndDate = config.iterationData.EndDate;
            this.Name = config.iterationData.Name;
        }

        this._logger = config.logger
    },
    addIteration: function(iterationObj){
        if (!this._iterations){
            this._iterations = [];
        }
        this._iterations.push(iterationObj);
    },
    addSnaps: function(snapshots){

        this._snaps = {};
        var projectTotalPlanEst = {};

        for (var i=0; i< snapshots.length; i++){
            var snap = snapshots[i].getData(),
                project = snap.Project;
            if (!snap.Iteration || this._isFutureIteration(snap.Iteration)){
                if (!projectTotalPlanEst[project]){
                    projectTotalPlanEst[project] = 0;
                }
                projectTotalPlanEst[project] += snap.PlanEstimate || 0;
                if (!this._snaps[project]){
                    this._snaps[project] = [];
                }
                this._snaps[project].push(snap);
            }
        }
        this._projectTotalPlanEstimates = projectTotalPlanEst;
        this._logger.log('addSnaps', this.Name, this._snaps, this._projectTotalPlanEstimates);
    },
    getFutureIterations: function(){
        return this._futureIterations || [];
    },
    _isFutureIteration: function(iterationObjectID){
        return this.getFutureIterations().indexOf(iterationObjectID) >= 0;
    },
    processIterations: function(iterations){
        var futureIterations = [],
            thisName = this.Name;

        for (var j=iterations.length - 1 ; j>=0; j--){
            if (iterations[j].get('StartDate') > this.EndDate){
                futureIterations.push(iterations[j].get('ObjectID'));
            } else if (iterations[j].get('Name') === thisName){
                this.addIteration(iterations[j].getData());
            }
        }
        this._futureIterations = futureIterations;
        this._logger.log('processIterations', this.Name, this._iterations, this._futureIterations);
    },
    calculateVelocity: function(currentRecords){
        var velocity = {},
            thisName = this.Name;

        Ext.Array.each(currentRecords, function(r){
            var iteration = r.get('Iteration'),
                project = r.get('Project').ObjectID;

            if (iteration._refObjectName === thisName){
                if (!velocity[project]){
                    velocity[project] = 0;
                }
                velocity[project] += r.get('PlanEstimate') || 0;
            }
        }, this);
        this._projectVelocity = velocity;
        this._logger.log('calculateVelocity', this.Name, this._projectVelocity);
    },
    getVelocity: function(projectObjectID){
        return this._projectVelocity && this._projectVelocity[projectObjectID] || 0;
    },
    getTotalPlanEstimate: function(projectObjectID){
        return this._projectTotalPlanEstimates && this._projectTotalPlanEstimates[projectObjectID] || 0;
    },
    getSnapsForProject: function(projectObjectID){
        return this._snaps && this._snaps[projectObjectID] || [];
    }
});