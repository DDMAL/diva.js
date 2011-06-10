(function() {
    /*
        Unit tests writen using QUnit, jQuery's unit-testing framework
    */
    module("Some shit");
    test("Test test", function() {
        equals(1, 1, "1 == 1");
    });
    module("Some other shit");
    test("Another test", function() {
        equals("lol", "lol", "lol == lol");
        equals("another", "lol", "another !== lol");
    });
}());
