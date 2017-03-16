Ext.define('RallyTechServices.backlogreadydepth.utils.Toolbox',{
    singleton: true,

    fetchWsapiRecords: function(config, storeType){
        var deferred = Ext.create('Deft.Deferred');

        if (!storeType){
            storeType = 'Rally.data.wsapi.Store';
        }

        if (!config.limit){
            config.limit = "Infinity";
        }
        if (!config.pageSize){
            config.pageSize = 2000;
        }

        Ext.create(storeType,config).load({
            callback: function(records, operation){
                if (operation.wasSuccessful()){
                    deferred.resolve(records);
                } else {
                    deferred.reject("Error fetching from store for: " + operation.error.errors.join(","));
                }
            }
        });
        return deferred.promise;
    },
    fetchWsapiArtifactRecords: function(config){
        return RallyTechServices.backlogreadydepth.utils.Toolbox.fetchWsapiRecords(config, "Rally.data.wsapi.artifact.Store");
    },
    fetchLookbackSnapshots: function(config){
        var deferred = Ext.create('Deft.Deferred');

        config.removeUnauthorizedSnapshots = true;
        if (!config.limit){
            config.limit = Infinity;
        }

        Ext.create('Rally.data.lookback.SnapshotStore', config).load({
            callback: function(records, operation){
                if (operation.wasSuccessful()){
                    deferred.resolve(records);
                } else {
                    deferred.reject('Error loading snapshots: ' + operation.error.errors.join(','));
                }
            }
        });

        return deferred;
    },
    getHighchartsColorWithOpacity: function(color, opacity){
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
        if (result){
           // return rgba(parseInt(result[1], 16),parseInt(result[2], 16),parseInt(result[3], 16),opacity);
            return Ext.String.format('rgba({0},{1},{2},{3})',
                parseInt(result[1], 16),
                parseInt(result[2], 16),
                parseInt(result[3], 16),
                opacity
            );
        }
        return null;
    }
});