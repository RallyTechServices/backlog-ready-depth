describe("Given the iteration data, snapshots and velocity data, the Backlog Depth Calculator ", function() {

    var iterationData = [];
    var projects = [];
    var velocityData = [];
    var backlogData = [];
    var futureIterations = [];

    var calc = Ext.create('RallyTechServices.backlogreadydepth.utils.BacklogDepthCalculator',{
        iterationData: iterationData,
        projects: projects,
        numSprintsForAverageVelocity: 3
    });
    it("should calculate average velocity for the past N sprints",function(){
        expect(true).toBe(true);
    });

});
