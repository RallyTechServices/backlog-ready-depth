Ext.define('RallyTechServices.ui.combobox.BooleanFieldComboBox', {
    requires: [],
    extend: 'Rally.ui.combobox.FieldComboBox',
    alias: 'widget.booleanfieldcombobox',

    _isNotHidden: function(field){
       return !field.readOnly && field.attributeDefinition && field.attributeDefinition.AttributeType === "BOOLEAN";
    }

});
