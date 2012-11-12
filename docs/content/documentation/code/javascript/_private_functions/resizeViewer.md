{% load extras %}

* **Parameters**: 2
    * **newWidth**: the desired width of the document viewer pane
    * **newHeight**: the desired height of the document viewerpane
* **Return type**: none
* **Called by**: [`init()`](#init), [`this.setState()`](#this.setState),
  [`this.resize()`](#this.resize)

Resizes the document viewer pane to the dimensions given (if they are valid).
Takes care of updating {% settings_link "panelHeight" %} and
{% settings_link "panelWidth" %}.
