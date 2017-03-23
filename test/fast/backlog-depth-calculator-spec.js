describe("Given the iteration data, snapshots and velocity data, the Backlog Depth Calculator ", function() {

    var iterationData = [];
    var projects = [];
    var velocityData = [];
    var backlogData = [];
    var futureIterations = [];

    var calc = Ext.create('RallyTechServices.backlogreadydepth.utils.BacklogDepthCalculator',{
        iterationData: iterationData,
        projects: projects,
        velocityData: velocityData,
        backlogData: backlogData,
        numSprintsForAverageVelocity: 3,
        numSprintsToTrend: 4,
        futureIterations: futureIterations
    });
    it("should calculate average velocity for the past N sprints",function(){
        expect(true).toBe(true);
    });

});
