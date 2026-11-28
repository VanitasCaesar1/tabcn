const part = require('./panel-part');
const { Menu } = require('./panelui-menu');

const ContextMenu = Object.assign(part('PanelContextMenu'), {
  Trigger: part('PanelContextMenu.Trigger'),
  Content: part('PanelContextMenu.Content'),
  Preview: part('PanelContextMenu.Preview'),
  Item: part('PanelContextMenu.Item'),
  CheckboxItem: part('PanelContextMenu.CheckboxItem'),
  Background: Menu.Background,
  Label: Menu.Label,
  RadioGroup: Menu.RadioGroup,
  RadioItem: Menu.RadioItem,
  Separator: Menu.Separator,
  Sub: Menu.Sub,
  SubTrigger: Menu.SubTrigger,
  SubContent: Menu.SubContent,
});

module.exports = { ContextMenu };
