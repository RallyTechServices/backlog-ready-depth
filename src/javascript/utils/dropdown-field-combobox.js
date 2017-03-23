Ext.define('RallyTechServices.ui.combobox.DropdownFieldComboBox', {
    requires: [],
    extend: 'Rally.ui.combobox.FieldComboBox',
    alias: 'widget.dropdownfieldcombobox',

    _isNotHidden: function(field){
        return !field.readOnly && field.attributeDefinition
            && field.attributeDefinition.Constrained &&
            field.attributeDefinition.AttributeType === "STRING";
    }

});
