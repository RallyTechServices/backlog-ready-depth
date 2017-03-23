# Backlog Ready Depth

## Summary/Description

For all leaf teams/projects in the current scope, this app will show the calculated backlog depth for all teams and the selected number of sprints to trend.  

![screenshot](./images/backlog-ready-depth.png)

Backlog Ready Depth is defined as (for each sprint):

*Total Plan Estimate in Backlog* / Average *Velocity* for the previous 3 sprints

The *Total Plan Estimate in Backlog* is calculated as follows:
*  A snapshot in time is taken at the Start Date and Time of the sprint that the backlog depth is calculated for to find all user stories (and defects if selected in the settings) that meet the following criteria:
+  ScheduleState = Defined
+  Blocked = false 
+  Ready = true
+  PlanEstimate > 0
+  If a Filter Field is configured in the App Setings, then only stories that have the configured values for the Filter Field will be included in the total plan estimate sum

The *Velocity* is the CURRENT total Plan Estimate for work items.  Note that if a story was accepted after the sprint end date boundary, and is still associated with the sprint, it will be included in the current velocity.  Note that calculation of velocity is for all items in the iteration and is NOT filtered, even if a Filter Field is selected in the App Settings.     

## Exports 
*  Backlog Depth Summary - simple summary of the Backlog Ready Depth calculations that make up the chart (Team, Sprint and Backlog Depth Calculation)
*  Velocity Summary - for each team represented, and each of the sprints (including the 3 used in historical velocity calculations and not included on the chart), summary of the current velocity calculated for the team and iteration
*  Backlog Details - for each Team and Iteration, the formatted ids and plan estimate of each work item that made up the backlog used in the *total plan estimate in backlog* calculation above. 

## Assumptions
*  All projects in current scope (including currently selected project) have the same sprint/iteration cadence and sprint/iteration objects defined at all levels 
*  Assumes that iterations with the same name have the same start and end dates.  

## App Settings

+ Number Sprints to Trend - Number of sprints to show backlog depth for.  There will be one series for each sprint.  
+ Include Defects - if checked, defects will be included in the backlog depth calculation.  Note that if a Filter field is selected and that filter field is not on the defect object, then no defects will be included, despite this setting.
+ Include Project Field - If selected, projects will only be displayed on the chart if this custom (boolean) project field is set to true.  If this field is not defined, then all leaf projects in the current scope will be included on the chart.  
+ Filter Field - Field to use to filter values by.  If not selected, all work items in the scope will be included.  
+ Filter Value - Values to include in the datasets for backlog depth calculations.  Ignored if no filter field is selected.  Also ignored if no values are selected.    
+ Max number Sprints Visible - Maximum number of sprints to show on the bottom axis of the graph.  Set to 0 for the graph to be auto-scaled according to returned data. If this number is set and any point goes over, you will see a visual indicator on the right side of the plot area.
+ Inner Threshold Start - the beginning (in Sprints) of the inner (light green) threshold on the chart
+ Inner Threshold End - the end (in Sprints) of the inner (light green) threshold on the chart
+ Outer Threshold Start - the beginning (in Sprints) of the outer (light yellow) threshold on the chart
+ Outer Threshold End - the end (in Sprints) of the outer (light yellow) threshold on the chart

![screenshot](./images/backlog-ready-depth-settings.png)

#### Color Threshold Settings for Graph
+ Inner Threshold
+ Inner Color
+ Outer Threshold
+ Outer Color
+ Outside Color



## Development Notes


### First Load

If you've just downloaded this from github and you want to do development, 
you're going to need to have these installed:

 * node.js
 * grunt-cli
 * grunt-init
 
Since you're getting this from github, we assume you have the command line
version of git also installed.  If not, go get git.

If you have those three installed, just type this in the root directory here
to get set up to develop:

  npm install

### Structure

  * src/javascript:  All the JS files saved here will be compiled into the 
  target html file
  * src/style: All of the stylesheets saved here will be compiled into the 
  target html file
  * test/fast: Fast jasmine tests go here.  There should also be a helper 
  file that is loaded first for creating mocks and doing other shortcuts
  (fastHelper.js) **Tests should be in a file named <something>-spec.js**
  * test/slow: Slow jasmine tests go here.  There should also be a helper
  file that is loaded first for creating mocks and doing other shortcuts 
  (slowHelper.js) **Tests should be in a file named <something>-spec.js**
  * templates: This is where templates that are used to create the production
  and debug html files live.  The advantage of using these templates is that
  you can configure the behavior of the html around the JS.
  * config.json: This file contains the configuration settings necessary to
  create the debug and production html files.  
  * package.json: This file lists the dependencies for grunt
  * auth.json: This file should NOT be checked in.  Create this to create a
  debug version of the app, to run the slow test specs and/or to use grunt to
  install the app in your test environment.  It should look like:
    {
        "username":"you@company.com",
        "password":"secret",
        "server": "https://rally1.rallydev.com"
    }
  
### Usage of the grunt file
####Tasks
    
##### grunt debug

Use grunt debug to create the debug html file.  You only need to run this when you have added new files to
the src directories.

##### grunt build

Use grunt build to create the production html file.  We still have to copy the html file to a panel to test.

##### grunt test-fast

Use grunt test-fast to run the Jasmine tests in the fast directory.  Typically, the tests in the fast 
directory are more pure unit tests and do not need to connect to Rally.

##### grunt test-slow

Use grunt test-slow to run the Jasmine tests in the slow directory.  Typically, the tests in the slow
directory are more like integration tests in that they require connecting to Rally and interacting with
data.

##### grunt deploy

Use grunt deploy to build the deploy file and then install it into a new page/app in Rally.  It will create the page on the Home tab and then add a custom html app to the page.  The page will be named using the "name" key in the config.json file (with an asterisk prepended).

To use this task, you must create an auth.json file that contains the following keys:
{
    "username": "fred@fred.com",
    "password": "fredfredfred",
    "server": "https://us1.rallydev.com"
}

(Use your username and password, of course.)  NOTE: not sure why yet, but this task does not work against the demo environments.  Also, .gitignore is configured so that this file does not get committed.  Do not commit this file with a password in it!

When the first install is complete, the script will add the ObjectIDs of the page and panel to the auth.json file, so that it looks like this:

{
    "username": "fred@fred.com",
    "password": "fredfredfred",
    "server": "https://us1.rallydev.com",
    "pageOid": "52339218186",
    "panelOid": 52339218188
}

On subsequent installs, the script will write to this same page/app. Remove the
pageOid and panelOid lines to install in a new place.  CAUTION:  Currently, error checking is not enabled, so it will fail silently.

##### grunt watch

Run this to watch files (js and css).  When a file is saved, the task will automatically build and deploy as shown in the deploy section above.

