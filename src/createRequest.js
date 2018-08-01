import React from 'react';
import PropTypes from 'prop-types';
import omit from 'lodash/omit';
import { shallowEqual, isPromise } from './utils';

const propTypes = {
  initialValue: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.number,
    PropTypes.string,
    PropTypes.array,
    PropTypes.object,
  ]),
  component: PropTypes.func,
  render: PropTypes.func,
  children: PropTypes.oneOfType([PropTypes.func, PropTypes.node]),
  onFulfilled: PropTypes.func,
  onRejected: PropTypes.func,
};

const getRequestProps = props => omit(props, Object.keys(propTypes));

const defaultOptions = {
  shouldDataUpdate: (props, nextProps) => !shallowEqual(props, nextProps),
};

function createRequest(initialValue, mapPropsToRequest, options) {
  const { shouldDataUpdate } = Object.assign({}, defaultOptions, options);

  return class RequestComponent extends React.Component {
    static propTypes = propTypes;

    static defaultProps = {
      initialValue,
      onFulfilled: () => {},
      onRejected: () => {},
    };

    constructor(props) {
      super(props);
      this.requestProps = getRequestProps(props);
      this.request = mapPropsToRequest(this.requestProps);
      this.state = {
        isLoading: isPromise(this.request),
        args: {},
        data: props.initialValue,
        error: null,
      };
    }

    componentDidMount() {
      this.fetchData(this.requestProps, this.request);
    }

    componentDidUpdate() {
      const nextRequestProps = getRequestProps(this.props);
      if (shouldDataUpdate(this.requestProps, nextRequestProps)) {
        this.fetchData(nextRequestProps);
      }
    }

    componentWillUnmount() {
      this.request = null;
    }

    setLoading = (value) => {
      this.setState(
        ({ isLoading }) => (isLoading === value ? null : { isLoading: value }),
      );
    };

    fetchData = (args, request = mapPropsToRequest(args)) => {
      if (!isPromise(request)) return;
      this.requestProps = args;
      this.request = request;
      this.setLoading(true);
      request.then(
        (data) => {
          if (this.request === request) {
            this.setState({ args, data, isLoading: false, error: null }, () =>
              this.props.onFulfilled(data),
            );
          }
        },
        (error) => {
          if (this.request === request) {
            this.setState({ args, isLoading: false, error }, () =>
              this.props.onRejected(error),
            );
          }
        },
      );
    };

    updateData = (args) => {
      this.fetchData(Object.assign({}, this.requestProps, args));
    };

    render() {
      const { render, component, children } = this.props;
      const renderProps = { ...this.state, updateData: this.updateData };
      if (component) return React.createElement(component, renderProps);
      if (render) return render(renderProps);
      if (typeof children === 'function') return children(renderProps);
      return null;
    }
  };
}

export default createRequest;
