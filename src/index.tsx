import React from 'react';
import readline from 'readline';
import { Box, StdinProps, BoxProps, Text, useStdin } from 'ink';

/**
 * Represent props of a <Tab>
 */
export interface TabProps {
  name: string;
}

/**
 * A <Tab> component
 */
// eslint-disable-next-line react/prop-types
const Tab: React.FunctionComponent<TabProps> = ({ children }) => (
  <>{children}</>
);

/**
 * Declare how does the keyboard interacts with ink-tab here
 */
interface KeyMapProps {
  useNumbers?: boolean;
  useTab?: boolean;
  previous?: string[];
  next?: string[];
}

interface RequiredKeyMapProps {
  useNumbers: boolean;
  useTab: boolean;
  previous: string[];
  next: string[];
}

/**
 * Props for the <Tabs> component
 */
export interface TabsProps {
  /**
   * A function called whenever a tab is changing.
   * @param {string} name the name of the tab passed in the `name` prop
   * @param {React.Component<TabProps>} activeTab the current active tab component
   */
  onChange(name: string, activeTab: React.ReactElement<typeof Tab>): void;
  children: React.ReactElement<typeof Tab>[];
  flexDirection?: BoxProps['flexDirection'];
  width?: BoxProps['width'];
  keyMap?: KeyMapProps;
  isFocused?: boolean;
  defaultValue?: string;
  showIndex?: boolean;
}
interface TabsWithStdinProps extends TabsProps {
  isRawModeSupported: boolean;
  setRawMode: StdinProps['setRawMode'];
  stdin: StdinProps['stdin'];
}

interface TabsWithStdinState {
  activeTab: number;
}

class TabsWithStdin extends React.Component<
  TabsWithStdinProps,
  TabsWithStdinState
> {
  // eslint-disable-next-line react/sort-comp
  private defaultKeyMap: RequiredKeyMapProps;

  public static defaultProps = {
    flexDirection: 'row',
    keyMap: null,
    isFocused: null, // isFocused is null mean that the focus not handle by ink
    defaultValue: null,
    showIndex: true,
  };

  constructor(props: TabsWithStdinProps) {
    super(props);

    this.handleTabChange = this.handleTabChange.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.moveToNextTab = this.moveToNextTab.bind(this);
    this.moveToPreviousTab = this.moveToPreviousTab.bind(this);

    this.state = {
      activeTab: 0,
    };

    this.defaultKeyMap = {
      useNumbers: true,
      useTab: true,
      previous: [this.isColumn() ? 'up' : 'left'],
      next: [this.isColumn() ? 'down' : 'right'],
    };
  }

  componentDidMount(): void {
    const {
      stdin,
      setRawMode,
      isRawModeSupported,
      children,
      defaultValue,
    } = this.props;

    if (isRawModeSupported && stdin) {
      // use ink / node `setRawMode` to read key-by-key
      if (setRawMode) {
        setRawMode(true);
      }

      readline.emitKeypressEvents(stdin);
      stdin.on('keypress', this.handleKeyPress);
    }

    // select defaultValue if it's valid otherwise select the first tab on component mount
    let initialTabIndex = 0;

    if (defaultValue) {
      const foundIndex = children.findIndex(
        child => child.props.name === defaultValue
      );

      if (foundIndex > 0) {
        initialTabIndex = foundIndex;
      }
    }

    this.handleTabChange(initialTabIndex);
  }

  componentWillUnmount(): void {
    const { stdin, setRawMode, isRawModeSupported } = this.props;

    if (isRawModeSupported && stdin) {
      if (setRawMode) {
        setRawMode(false); // remove set raw mode, as it might interfere with CTRL-C
      }
      stdin.removeListener('keypress', this.handleKeyPress);
    }
  }

  handleTabChange(tabId: number): void {
    const { children, onChange } = this.props;

    const tab = children[tabId];

    if (!tab) {
      return;
    }

    this.setState({
      activeTab: tabId,
    });

    onChange(tab.props.name, tab);
  }

  handleKeyPress(
    ch: string,
    key: null | { name: string; shift: boolean; meta: boolean }
  ): void {
    const { keyMap, isFocused } = this.props;

    if (!key || isFocused === false) {
      return;
    }

    const currentKeyMap = { ...this.defaultKeyMap, ...keyMap };
    const { useNumbers, useTab, previous, next } = currentKeyMap;

    if (previous.some(keyName => keyName === key.name)) {
      this.moveToPreviousTab();
    }

    if (next.some(keyName => keyName === key.name)) {
      this.moveToNextTab();
    }

    switch (key.name) {
      case 'tab': {
        if (!useTab || isFocused !== null) {
          // if isFocused != null, then the focus is managed by ink and thus we can not use this key
          return;
        }

        if (key.shift === true) {
          this.moveToPreviousTab();
        } else {
          this.moveToNextTab();
        }

        break;
      }

      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9': {
        if (!useNumbers) {
          return;
        }
        if (key.meta === true) {
          const tabId = key.name === '0' ? 9 : parseInt(key.name, 10) - 1;

          this.handleTabChange(tabId);
        }

        break;
      }

      default:
        break;
    }
  }

  isColumn(): boolean {
    const { flexDirection } = this.props;

    return flexDirection === 'column' || flexDirection === 'column-reverse';
  }

  moveToNextTab(): void {
    const { children } = this.props;
    const { activeTab } = this.state;

    let nextTabId = activeTab + 1;
    if (nextTabId >= children.length) {
      nextTabId = 0;
    }

    this.handleTabChange(nextTabId);
  }

  moveToPreviousTab(): void {
    const { children } = this.props;
    const { activeTab } = this.state;

    let nextTabId = activeTab - 1;
    if (nextTabId < 0) {
      nextTabId = children.length - 1;
    }

    this.handleTabChange(nextTabId);
  }

  render(): React.ReactNode {
    const {
      children,
      flexDirection,
      width,
      isFocused,
      showIndex,
      ...rest
    } = this.props;
    const { activeTab } = this.state;

    const separatorWidth = width || 6;

    const separator = this.isColumn()
      ? new Array(separatorWidth).fill('─').join('')
      : ' | ';

    return (
      <Box flexDirection={flexDirection} width={width} {...rest}>
        {children.map((child, key) => {
          const { name } = child.props;
          let colors = {};
          if (isFocused !== false) {
            colors = {
              backgroundColor: activeTab === key ? 'green' : undefined,
              color: activeTab === key ? 'black' : undefined,
            };
          } else {
            colors = {
              backgroundColor: activeTab === key ? 'gray' : undefined,
              color: activeTab === key ? 'black' : undefined,
            };
          }

          return (
            <Box key={name} flexDirection={flexDirection}>
              {key !== 0 && <Text color="dim">{separator}</Text>}
              <Box>
                {showIndex && <Text color="grey">{key + 1}. </Text>}
                <Text {...colors}>{child}</Text>
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  }
}

/**
 * The <Tabs> component
 */
const Tabs: React.FunctionComponent<TabsProps> = props => {
  const { isRawModeSupported, stdin, setRawMode } = useStdin();

  return (
    <TabsWithStdin
      isRawModeSupported={isRawModeSupported}
      stdin={stdin}
      setRawMode={setRawMode}
      {...props}
    />
  );
};

export { Tab, Tabs };
