import Tag from '../../../lib/extend/tag';
import chai from 'chai';
const should = chai.should();

describe('Tag', () => {
  const tag = new Tag();

  it('register()', async () => {
    const tag = new Tag();

    tag.register('test', (args, content) => args.join(' '));

    const result = await tag.render('{% test foo.bar | abcdef > fn(a, b, c) < fn() %}');
    result.should.eql('foo.bar | abcdef > fn(a, b, c) < fn()');
  });

  it('register() - async', async () => {
    const tag = new Tag();

    tag.register('test', async (args, content) => args.join(' '), { async: true });

    const result = await tag.render('{% test foo bar %}');
    result.should.eql('foo bar');
  });

  it('register() - block', async () => {
    const tag = new Tag();

    tag.register('test', (args, content) => args.join(' ') + ' ' + content, true);

    const str = [
      '{% test foo bar %}',
      'test content',
      '{% endtest %}'
    ].join('\n');

    const result = await tag.render(str);
    result.should.eql('foo bar test content');
  });

  it('register() - async block', async () => {
    const tag = new Tag();

    tag.register('test', async (args, content) => args.join(' ') + ' ' + content, { ends: true, async: true });

    const str = [
      '{% test foo bar %}',
      'test content',
      '{% endtest %}'
    ].join('\n');

    const result = await tag.render(str);
    result.should.eql('foo bar test content');
  });

  it('register() - nested test', async () => {
    const tag = new Tag();

    tag.register('test', (args, content) => content, true);

    const str = [
      '{% test %}',
      '123456',
      '  {% raw %}',
      '  raw',
      '  {% endraw %}',
      '  {% test %}',
      '  test',
      '  {% endtest %}',
      '789012',
      '{% endtest %}'
    ].join('\n');

    const result = await tag.render(str);
    result.replace(/\s/g, '').should.eql('123456rawtest789012');
  });

  it('register() - nested async / async test', async () => {
    const tag = new Tag();

    tag.register('test', (args, content) => content, {ends: true, async: true});
    tag.register('async', async (args, content) => args.join(' ') + ' ' + content, { ends: true, async: true });

    const str = [
      '{% test %}',
      '123456',
      '  {% async %}',
      '  async',
      '  {% endasync %}',
      '789012',
      '{% endtest %}'
    ].join('\n');

    const result = await tag.render(str);
    result.replace(/\s/g, '').should.eql('123456async789012');
  });

  it('register() - strip indention', async () => {
    const tag = new Tag();

    tag.register('test', (args, content) => content, true);

    const str = [
      '{% test %}',
      '  test content',
      '{% endtest %}'
    ].join('\n');

    const result = await tag.render(str);
    result.should.eql('test content');
  });

  it('register() - async callback', async () => {
    const tag = new Tag();

    tag.register('test', async (args, content, callback) => {
      callback && callback(null, args.join(' '));
      return '';
    }, { async: true });

    const result = await tag.render('{% test foo bar %}');
    result.should.eql('foo bar');
  });

  it('register() - name is required', () => {
    // @ts-expect-error
    should.throw(() => tag.register(), 'name is required');
  });

  it('register() - fn must be a function', () => {
    // @ts-expect-error
    should.throw(() => tag.register('test'), 'fn must be a function');
  });

  it('unregister()', () => {
    const tag = new Tag();

    tag.register('test', async (args, content) => args.join(' '), {async: true});
    tag.unregister('test');

    return tag.render('{% test foo bar %}')
      .then(result => {
        console.log(result);
        throw new Error('should return error');
      })
      .catch(err => {
        err.should.have.property('type', 'unknown block tag: test');
      });
  });

  it('unregister() - name is required', () => {
    // @ts-expect-error
    should.throw(() => tag.unregister(), 'name is required');
  });

  it('render() - context', async () => {
    const tag = new Tag();

    tag.register('test', function() {
      return this.foo;
    });

    const result = await tag.render('{% test %}', { foo: 'bar' });
    result.should.eql('bar');
  });

  it('render() - callback', () => {
    const tag = new Tag();

    // spy() is not a function
    let spy = false;
    const callback = () => {
      spy = true;
    };

    tag.register('test', () => 'foo');

    return tag.render('{% test %}', callback).then(result => {
      result.should.eql('foo');
      spy.should.eql(true);
    });
  });
});
