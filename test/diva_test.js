import Diva from "../source/js/diva";
import {
    DivaParentElementNotFoundException,
    ObjectDataNotSuppliedException
} from "../source/js/exceptions";

describe('Viewer', function ()
{
    it('should throw an exception if the parent is not found', function ()
    {
        let fcn = () => { new Diva('blah', {}); };
        expect(fcn).to.throw(DivaParentElementNotFoundException);
    });

    it('should not throw an exception if the parent div is found', () =>
    {
        let fcn = () => { new Diva('diva-wrapper', {}); };
        expect(fcn).to.not.throw(DivaParentElementNotFoundException);
    });

    it('should allow an element object to be passed in as a parent', () =>
    {
        let parent = document.createElement('div');
        let fcn = () => { new Diva(parent, {}); };
        expect(fcn).to.not.throw(DivaParentElementNotFoundException);
    });

    it('should throw an exception if objectData is not supplied', () =>
    {
        let parent = document.createElement('div');
        let fcn = () => { new Diva(parent, {}); };
        expect(fcn).to.throw(ObjectDataNotSuppliedException);
    });

    it('should not throw an exception if objectData is supplied', () =>
    {
        let parent = document.createElement('div');
        let fcn = () => { new Diva(parent, {
            objectData: 'https://example.com/iiif/manifest.json'
        }); };
        expect(fcn).to.not.throw(ObjectDataNotSuppliedException);
    });
});
