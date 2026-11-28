const part = require('./panel-part');

const Menu = Object.assign(part('PanelMenu'), {
  Trigger: part('PanelMenu.Trigger'),
  Content: part('PanelMenu.Content'),
  Background: part('PanelMenu.Background'),
  Label: part('PanelMenu.Label'),
  Item: part('PanelMenu.Item'),
  CheckboxItem: part('PanelMenu.CheckboxItem'),
  RadioGroup: part('PanelMenu.RadioGroup'),
  RadioItem: part('PanelMenu.RadioItem'),
  Separator: part('PanelMenu.Separator'),
  Sub: part('PanelMenu.Sub'),
  SubTrigger: part('PanelMenu.SubTrigger'),
  SubContent: part('PanelMenu.SubContent'),
});

module.exports = { Menu };
